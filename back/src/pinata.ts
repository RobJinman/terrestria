import https from "https";
import http from "http";
import { Logger } from "./logger";

export class PinataHttpError {
  constructor(public reason: string,
              public messageFromServer?: string,
              public httpStatusCode?: number) {}
}

export interface AuthResponse {
  accountId: string;
  username: string;
  token: string;
}

export interface AdSlice {
  url: string;
}

export enum CreateAwardResult {
  SUCCESS = "SUCCESS",
  VALUE_BELOW_THRESHOLD = "VALUE_BELOW_THRESHOLD"
}

export interface CreateAwardResponse {
  result: CreateAwardResult;
  fetti: number;
}

function authHeader(token: string): http.OutgoingHttpHeaders {
  return {
    "Authorization": "Bearer " + token
  };
}

export class Pinata {
  private _apiBase: string;
  private _productKey: string;
  private _logger: Logger;

  constructor(apiBase: string, productKey: string, logger: Logger) {
    this._apiBase = apiBase;
    this._productKey = productKey;
    this._logger = logger;
  }

  grantAward(name: string, token: string): Promise<CreateAwardResponse> {
    const url = `${this._apiBase}/gamer/award`;

    const headers = {
      "productKey": this._productKey,
      ...authHeader(token)
    };

    const body = {
      name
    };

    return this._sendPostRequest(url, JSON.stringify(body), headers);
  }

  logIn(identity: string, password: string): Promise<AuthResponse> {
    this._logger.debug("Authenticating");

    const body = {
      identity,
      password
    };

    const payload = JSON.stringify(body);
    const url = `${this._apiBase}/gamer/log-in`;

    return this._sendPostRequest(url, payload);
  }

  signUp(username: string,
         email: string,
         password: string): Promise<AuthResponse> {
    this._logger.debug("Creating new account");

    const body = {
      username,
      email,
      password
    };

    const payload = JSON.stringify(body);
    const url = `${this._apiBase}/gamer/sign-up`;

    return this._sendPostRequest(url, payload);
  }

  private _sendPostRequest(url: string,
                           payloadJson: string,
                           headers: http.OutgoingHttpHeaders = {}) {
    const defaultHeaders = {
      "Content-Type": "application/json",
      "Content-Length": payloadJson.length,
    };

    const allHeaders = {...defaultHeaders, ...headers};

    const options: http.RequestOptions = {
      method: "POST",
      headers: allHeaders,
      agent: false
    };

    return this._sendRequest(url, options, payloadJson);
  }

  private _sendRequest(url: string,
                       options: http.RequestOptions,
                       payloadJson?: string): Promise<any> {
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
              reject(new PinataHttpError("Error from Pinata server",
                                         responseJson,
                                         res.statusCode));
            }
            const data = JSON.parse(responseJson);
            resolve(data);
          }
          catch (err) {
            reject(new PinataHttpError("Error parsing response from Pinata " +
                                       "server", responseJson));
          }
        });
      });

      req.on("error", err => {
        reject(new PinataHttpError("Error making request to Pinata server"));
      });

      if (payloadJson) {
        req.write(payloadJson);
      }
      req.end();
    });
  }
}
