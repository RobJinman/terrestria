import https from "https";
import http from "http";

export interface AuthResponse {
  accountId: string;
  token: string;
}

export interface AdSpace {
  id: string;
  name: string;
  currentAd?: {
    id: string;
    finalAsset?: {
      id: string;
      fileName: string;
      sizeInKb: number;
      key: string;
      url: string;
    }
  }
}

export type AdSpaceResponse = AdSpace[];

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

  constructor(apiBase: string, productKey: string) {
    this._apiBase = apiBase;
    this._productKey = productKey;
  }

  getAdSpaces(): Promise<AdSpaceResponse> {
    const url = `${this._apiBase}/gamer/ad-space`;

    const headers = {
      "productKey": this._productKey
    };

    return this._sendGetRequest(url, headers);
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

  logIn(email: string, password: string): Promise<AuthResponse> {
    console.log("Authenticating");

    const body = {
      email,
      password
    };

    const payload = JSON.stringify(body);
    const url = `${this._apiBase}/gamer/log-in`;

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

  private _sendGetRequest(url: string,
                          headers: http.OutgoingHttpHeaders = {}) {
    const defaultHeaders = {
      "Content-Type": "application/json"
    };

    const allHeaders = {...defaultHeaders, ...headers};

    const options: http.RequestOptions = {
      method: "GET",
      headers: allHeaders,
      agent: false
    };

    return this._sendRequest(url, options);
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

      if (payloadJson) {
        req.write(payloadJson);
      }
      req.end();
    });
  }
}
