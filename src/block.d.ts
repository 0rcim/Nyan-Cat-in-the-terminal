export interface Block {
  FRAME? : FRAME[];
  MAP? : MAP[];
}

export interface MAP {
  index : number;
  content : string[];
  COLOR : string;
  POSITION : string;
}

export interface FRAME {
  index : number;
  content : string[];
}