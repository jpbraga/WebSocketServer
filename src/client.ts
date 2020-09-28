import { WSSClient } from '../test/wssClient';
import * as dotenv from "dotenv";
const result = dotenv.config();
if (result.error) {
  throw result.error;
}

let client:WSSClient = new WSSClient();


