import app from "../server/_core/index";

export default function handler(req:any, res:any) {
  return app(req, res);
}