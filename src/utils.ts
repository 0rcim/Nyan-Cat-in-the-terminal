import { readFileSync , readdirSync , existsSync } from "fs";
import { resolve } from "path";
import { FileSectionObj } from "./block";

class Ansi256Colors {
  protected LIB:{[index: string]: number};
  constructor(relative_lib_path:string) {
    let lib_text = readFileSync(
      resolve(__dirname, relative_lib_path),
      {encoding: "utf-8"}
    );
    let lib = {};
    lib_text.split(/[\n\r]+/).filter(i => i).forEach((hex_str, idx) => {
      let RGB : any[] = hex_str.match(/[0-9A-F]{2}/ig);
      lib[RGB.join("").toUpperCase()] = idx;
    });
    this.LIB = lib;
  }

  query(hex_color:string) {
    let mth : any[] = hex_color.toUpperCase().match(/[0-9A-F]{3,6}/g);
    if (mth) {
      if (mth[0].length === 3) {
        let [R,G,B] : string[] = mth[0].split("");
        return this.query([R,R,G,G,B,B].join("").toUpperCase());
      } else if (mth[0].length === 6) {
        let c = this.LIB[mth[0]];
        return c ? c : this.query("000");
      }
    } else {
      return this.query("000")
    }
  }
}

const color_lib = new Ansi256Colors("../data/ansi-color256-lib");

export class Frame {
  NAME:string = "untitled";
  FILE_CONTENT:string="";

  ZINDEX:number = 0;
  FRAMES:MapSection[] = [];
  constructor(path:string) {
    let validator = /[\/\\]([\s\S]+).cat[\/\\]\b([\s\S]+).zIndex=([-\d]+)$/i;
    let mth : any[] = path.match(validator);
    this.NAME = `${mth[1]}.${mth[2]}`;
    this.ZINDEX = mth && mth[3]*1;
    this.FILE_CONTENT = readFileSync(
      resolve(__dirname, path),
      {encoding: "utf-8"}
    );
    this.parse(this.FILE_CONTENT)
  }

  parse(content:string) {
    let sections : {MAP: FileSectionObj[], FRAME: FileSectionObj[]} = {MAP:[],FRAME:[]};
    let current_section_title : string = "";
    let mth : any[] = content.split(/[\n\r]+/).filter(i => i);
    // console.log(mth)
    mth.forEach(line => {
      if (line.match(/^\[[\s\S]*\]$/)) {
        let m = line.match(/^\[(MAP|FRAME)/);
        if (m) {
          if (!(m[1] in sections)) {sections[m[1]] = []};
          current_section_title = m[1];
          sections[m[1]].push({head: line.match(/^\[([\s\S]*)\]$/)[1], body: []});
        }
      } else {
        sections[current_section_title][sections[current_section_title].length-1].body.push(line)
      }
    });
    // new MapSection(sections.MAP[0], color_lib);
    // new FrameSection(sections.FRAME[0])
    // console.log(sections);
    let poolMap = sections.MAP.map(m => (o_x, o_y) => new MapSection(m, color_lib, o_x, o_y));
    let poolFrame = sections.FRAME.map(frm => new FrameSection(frm));
    let n_frames = poolFrame.map(frmSec => {
      return poolMap[frmSec.ref_map_idx](frmSec.offset_x, frmSec.offset_y);
    });
    this.FRAMES = n_frames;
    return sections;
  }
}

export class Section {
  attr:{[key:string]: string} = {};
  content:string[];
  constructor(obj:FileSectionObj) {
    obj.head.split(/;\s*/).forEach(name => {
      let [key, value] = name.split(/:\s*/);
      this.attr[key] = value;
    })
    this.content = obj.body;
  }
}

export class MapSection extends Section {
  index:number = -1;
  color:number[] = [];
  position:{x:number,y:number} = {x: 0, y: 0};
  map:number[][] = [];
  row:number;
  col:number;
  constructor(obj:FileSectionObj, color_lib:Ansi256Colors, offset_x:number=0, offset_y:number=0) {
    super(obj);
    this.index = parseInt(this.attr.MAP);
    this.color = this.attr.COLOR.split(/,\s*/).map(color => color_lib.query(color));
    let [x, y] = this.attr.POSITION.split(/,\s*/);
    this.position = {x: parseInt(x)+offset_x, y: parseInt(y)+offset_y};
    this.row = this.content.length - 1 + this.position.y;
    this.col = this.content[0].match(/x\d+/g).length + this.position.x;
    this.map = this.parse(this.content);
  }
  parse(content:string[]) {
    let [,...con] = content;
    let n_map = con.map(row => {
      let [,...col] = row.split("\t");
      return new Array(this.position.x).fill("").concat(col).map(i => {
        let code = this.color[i];
        return i in this.color ? code : -1;
      })
    });
    return new Array(this.position.y).fill(new Array(this.col).fill(-1)).concat(n_map);
  }
}

export class FrameSection extends Section {
  index:number = -1;
  ref_map_idx:number = 0;
  offset_x:number = 0;
  offset_y:number = 0;
  constructor(obj:FileSectionObj) {
    super(obj);
    let [ref,o_x,o_y] : any[] = obj.body[0].match(/-?\d+/g);
    this.ref_map_idx = ref*1;
    this.offset_x = o_x*1;
    this.offset_y = o_y*1;
  }
}

export class NyanCat {
  parts:Frame[];
  totFrame:number;
  FRAMESPOOL:number[][][] = [];
  constructor(relative_cat_dir:any, totFrame:number) {
    if (!existsSync(resolve(__dirname, relative_cat_dir))) relative_cat_dir = "../data/Gray.cat/";
    let path = resolve(__dirname, relative_cat_dir);
    console.log(path)
    let files = readdirSync(path);
    let parts = files.map(file => {
      return new Frame(resolve(relative_cat_dir, file))
    });
    parts.sort((a, b) => a.ZINDEX-b.ZINDEX);
    this.parts = parts;
    this.totFrame = totFrame;
    this.combineFrames();
  }

  combineFrames() {
    let row_col : {row:number;col:number}[] = [];
    this.parts.forEach(item => item.FRAMES.forEach(i => row_col.push({row:i.row, col:i.col})));
    let {row, col} = row_col.reduce((p, c) => ({
        row: p.row > c.row ? p.row : c.row,
        col: p.col > c.col ? p.col : c.col
      }), {row: 0, col: 0});
    let canvas : string = JSON.stringify(new Array(row).fill(new Array(col).fill(-1)));
    let a = 0;
    while(a < 6) {
      let frames = JSON.parse(canvas);
      for (let i=0; i<this.parts.length; i++) {
        for (let k=0; k<this.parts[i].FRAMES[a].map.length; k++) {
          for (let l=0; l<this.parts[i].FRAMES[a].map[k].length; l++) {
            if (this.parts[i].FRAMES[a].map[k][l] !== -1) {
              frames[k][l] = this.parts[i].FRAMES[a].map[k][l]
            }
          }
        }
      }
      // console.log(color(frames), "\n")
      this.FRAMESPOOL.push(frames);
      a++;
    };
  }
}

export function color(framesPool:number[][]) : string {
  let space = "  ";
  return framesPool.map(item => {
    return item.map(i => ~i ? `\x1b[48;5;${i}m${space}` : `\x1b[48;5;255m${space}\x1b[0m`).join("")
  }).join("\n\x1b[0m");
};