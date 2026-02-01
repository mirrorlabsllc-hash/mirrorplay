import { type ReqLike, type ResLike } from "../../../lib/apiUtils.js";

export default async function handler(_req: ReqLike, res: ResLike) {
  return res.status(501).json({
    error: "Not implemented",
    feature: "avatar-presets-detail",
  });
}
