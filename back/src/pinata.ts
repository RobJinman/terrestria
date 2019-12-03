import https from "https";
import http from "http";
import { LogInAction } from "./common/action";

export interface PinataAuthResponse {
  accountId: string;
  token: string;
}

export class Pinata {
  private _apiBase: string;
  private _productKey: string;

  constructor(apiBase: string, productKey: string) {
    this._apiBase = apiBase;
    this._productKey = productKey;
  }

  async getAdSpaces() {
    // TODO
  }

  pinataAuth(logInReq: LogInAction): Promise<PinataAuthResponse> {
    console.log("Authenticating");

    const email = logInReq.email;
    const password = logInReq.password;

    const body = {
      email,
      password
    };

    const payload = JSON.stringify(body);

    const options: http.RequestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": payload.length,
      },
      agent: false
    };

    const url = `${this._apiBase}/gamer/log-in`;

    return this._sendRequest(url, options, payload);
  }

  private async _sendRequest(url: string,
                             options: http.RequestOptions,
                             payloadJson: string): Promise<any> {
    const web = this._apiBase.startsWith("https") ? https: http;

    return new Promise((resolve, reject) => {
      let req = web.request(url, options, res => {
        let responseJson = "";

        res.on("data", chunk => {
          responseJson += chunk;
        });

        res.on("end", () => {
          try {
            if (res.statusCode != 200) {
              reject(`Error authenticating user: Status ${res.statusCode}`);
            }
            const data = JSON.parse(responseJson);
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

      req.write(payloadJson);
      req.end();
    });
  }
}
