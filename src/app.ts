import { NyanCat , color } from "./utils";
import { argv } from "process";

let [,,cat_name] = argv;

const totFrame = 6;
const GrayCat = new NyanCat("../data/" + cat_name, totFrame);
let currentFrameis = 0;

let coloredGrayCat : string[] = GrayCat.FRAMESPOOL.map(item => color(item));

console.log("\n\x1b[s");

move();

let timer = setInterval(move, 120);

function move(){
  console.log("\x1b[u" + coloredGrayCat[currentFrameis++ % totFrame] + "\nPress `Ctrl + C` to Exit.");
};
