import { readdirSync } from "fs";
import { resolve } from "path";
import { ParseBlock , ParseFrame , combineFrames } from "./utils";

let filename_validator = /([\s\S]+).zIndex=([-\d]+)$/i;
let datas = readdirSync(
  resolve(__dirname, "../data/")
).filter(i => filename_validator.test(i));

let blocks = datas.map(name => {
  let mth : any[] = name.match(filename_validator);
  let block = new ParseBlock(name), frames : any[] = new ParseFrame(block.parsedJSON).frames;
  return {
    name: mth[1],
    zindex: mth[2]*1,
    parsedFrames: frames
  }
})

blocks.sort((a,b) => a.zindex - b.zindex);

let framesPool = combineFrames(blocks), f = 0;

console.log("\x1b[100D\x1b[2J\n\x1b[s");

move();

let timer = setInterval(move, 200);

function move() {
  console.log("\x1b[u" + framesPool[f++%6].map(item => item.join("")).join("\n\x1b[0m") + "\n");
}