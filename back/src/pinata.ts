import https from "https";
import http from "http";
import { LogInAction } from "./common/action";

export interface PinataAuthResponse {
  accountId: string;
  token: string;
}

export async function pinataAuth(logInReq: LogInAction):
  Promise<PinataAuthResponse> {

  console.log("Authenticating");

  return new Promise<PinataAuthResponse>((resolve, reject) => {
    const email = logInReq.email;
    const password = logInReq.password;

    const body = {
      email,
      password
    };

    const payload = JSON.stringify(body);

    console.log(payload);

    const options: http.RequestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": payload.length,
      },
      agent: false
    };

    const url = "http://localhost:3000/gamer/log-in";

    let req = http.request(url, options, res => {
      let json = "";

      res.on("data", chunk => {
        json += chunk;
      })

      res.on("end", () => {
        try {
          if (res.statusCode != 200) {
            reject(`Error authenticating user: Status ${res.statusCode}`);
          }
          const data = JSON.parse(json);
          resolve(data);
        }
        catch (err) {
          reject("Error authenticating user: " + err);
        }
      });
    });

    req.on("error", err => {
      reject("Error authenticating user: " + err);
    });

    req.write(payload);
    req.end();
  });
}