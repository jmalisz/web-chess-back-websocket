 
import dotenv from "dotenv";
import express from "express";

// import helmet from "helmet";
import { createSocketIoServer } from "@/api/createSocketIoServer.server";

dotenv.config();

const { PORT } = process.env;

const app = express();

app.use(express.json());
// app.use(
//   helmet({
//     crossOriginResourcePolicy: false,
//   }),
// );

const { httpServer } = createSocketIoServer(app);
httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Express server is running at http://localhost:${PORT}`);
});
