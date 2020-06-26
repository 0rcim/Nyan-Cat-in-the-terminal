import { readFileSync } from "fs";
import { resolve } from "path";

import { Block , MAP , FRAME } from "./block";

export class ParseBlock {
  parsedJSON:Block;
  constructor(filename:string) {
    let content:string = readFileSync(
      resolve(__dirname, "../data/"+filename), 
      {encoding: "utf-8"}
    );
    let section = {}, current_section : string = "";
    let mth : any[] = content.split(/[\n\r]+/);

    mth.forEach(item => {
      let m = item.match(/\[([\s\S]*)\]$/);
      if (m && m.length) {
        current_section = m[1];
        if (!(current_section in section)) section[current_section] = [];
      } else {
        section[current_section].push(item);
      }
    });

    let parsedJSON = {};
    for (let k in section) {
      let [title_index, ...rest_attr] = k.split(/;\s*/);
      let [title, index] = title_index.split(/:\s*/);
      if (!(title in parsedJSON)) parsedJSON[title] = [];
      let res = { index: parseInt(index), content: section[k] };
      rest_attr.forEach(i => {
        let [key, val] = i.split(/:\s*/);
        res[key] = val;
      });
      parsedJSON[title].push(res)
    }

    this.parsedJSON = parsedJSON;

  }
}

export class ParseFrame {
  frames:object[] = [];
  space:string = "  ";
  colors256:object = {
    "#000": 0, "#fc9": 222, "#f9f": 207, "#f39": 198,
    "#999": 249, "#fff": 255, "#f99": 210
  }
  constructor(block:Block) {
    this.frames = this.parse2Frames(block);
  }

  parse2Frames(block:Block) {
    let frames : FRAME[] = block.FRAME, maps : MAP[] = block.MAP;
    let x = 0, y = 0;
    return frames.map(item => {
      let [map_idx,x_offset,y_offset] : any[] = item.content[0].match(/-?\d+/g);
      let [temp_x, temp_y] : any[] = maps[map_idx].POSITION.split(/,\s*/);
      let target_map = maps[map_idx];
      x = temp_x*1 + x_offset*1; y = temp_y*1 + y_offset*1;
      let [head, ...body] = target_map.content;
      let colNum : number = head.match(/\d+/g).length + x;
      let colorSet = target_map.COLOR.split(/,\s*/);
      let pixels = body.map(item => {
        let [,...des] = item.split("\t");
        return new Array(x).fill("").concat(des)
          .concat(new Array(colNum).fill(""))
          .map(i => (i ? `\x1b[48;5;${this.colors256[colorSet[i]]}m` : "") + this.space)
          .slice(0, colNum);
      });
      pixels = new Array(y).fill(new Array(colNum).fill(this.space)).concat(pixels);
      return pixels;
    })
  }
}

export function combineFrames(blocks) {
  let space : string = "  ";
  let max_row : number = blocks.map(i0 => i0.parsedFrames.map(i1 => i1.length)).flat(2).reduce((p,c) => p > c ? p : c, 0);
  let max_col : number = blocks.map(i0 => i0.parsedFrames.map(i1 => i1.map(i2 => i2.length))).flat(2).reduce((p,c) => p > c ? p : c, 0);

  let canvas : string[][] = new Array(max_row).fill(new Array(max_col).fill(`\x1b[48;5;255m${space}\x1b[0m`));
  let allFrames : string[][][] = [];
  
  let a = 0;
  while (a<6) {
    let frames = JSON.parse(JSON.stringify(canvas));
    for (let i=0; i<blocks.length; i++) {
      for (let k=0; k<blocks[i].parsedFrames[a].length; k++) {
        for (let l=0; l<blocks[i].parsedFrames[a][k].length; l++) {
          if (blocks[i].parsedFrames[a][k][l] !== space) {
            frames[k][l] = blocks[i].parsedFrames[a][k][l]
          }
        }
      }
    }
    allFrames[a] = frames;
    a++;
  }

  return allFrames;

  // console.log(allFrames.map(item => item.map(it => it.join("")).join("\n\x1b[0m")).join("\n\n\x1b[0m"));
}