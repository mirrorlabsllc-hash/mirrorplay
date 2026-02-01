import { type ReqLike, type ResLike } from "../../server/apiUtils";

export default async function handler(_req: ReqLike, res: ResLike) {
  return res.status(501).json({
    error: "Not implemented",
    feature: "voice-clone-use",
  });
}
