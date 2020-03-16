import https from "https";
import http from "http";
import { Logger } from "./logger";
import { GameError, ErrorCode } from "./common/error";

// How frequently to check for new adverts
const REFRESH_INTERVAL_MS = 1 * 60 * 1000;

export class PinataHttpError {
  constructor(public reason: string,
              public messageFromServer?: string,
              public httpStatusCode?: number) {}
}

export interface AuthResponse {
  accountId: string;
  userName: string;
  token: string;
}

export interface AdSpace {
  id: string;
  name: string;
}

export interface Advert {
  id: string;
  name: string;
  asset: {
    id: string;
    type: string;
    fileName: string;
    sizeInKb: number;
    url: string;
  }
}

export type AdSpacesResponse = AdSpace[];

export type AdvertsResponse = Advert[];

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

interface AdvertData {
  lastUpdated: number; // POSIX time
  adSlices: AdSlice[];
}

export class Pinata {
  private _apiBase: string;
  private _productKey: string;
  private _logger: Logger;

  // Name -> id
  private _adSpaceIds = new Map<string, string>();
  // Name -> (region -> slices)
  private _adSlices = new Map<string, Map<string, AdvertData>>();

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

  signUp(userName: string,
         email: string,
         password: string): Promise<AuthResponse> {
    this._logger.debug("Creating new account");

    const body = {
      userName,
      email,
      password
    };

    const payload = JSON.stringify(body);
    const url = `${this._apiBase}/gamer/sign-up`;

    return this._sendPostRequest(url, payload);
  }

  async getAdSlices(adSpaceName: string, region: string): Promise<AdSlice[]> {
    await this._updateAdSlicesIfNeeded(adSpaceName, region);

    const byRegion = this._adSlices.get(adSpaceName);
    if (!byRegion) {
      throw new GameError(`No ads for space with name ${adSpaceName}`,
                          ErrorCode.INTERNAL_ERROR);
    }

    const ads = byRegion.get(region);
    if (!ads) {
      return [];
    }
    return ads.adSlices;
  }

  private async _updateAdSlicesIfNeeded(adSpaceName: string, region: string) {
    const byRegion = this._adSlices.get(adSpaceName);
    if (!byRegion) {
      await this._fetchAdSlices(adSpaceName, region);
    }
    else {
      const ads = byRegion.get(region);
      const now = (new Date()).getTime();

      if (!ads || ads.lastUpdated < now - REFRESH_INTERVAL_MS) {
        await this._fetchAdSlices(adSpaceName, region);
      }
    }
  }

  private async _fetchAdSlices(adSpaceName: string, region: string) {
    if (this._adSpaceIds.size === 0) {
      await this._fetchAdSpaces();
    }

    const id = this._adSpaceIds.get(adSpaceName);
    if (!id) {
      throw new GameError(`No ad with name ${adSpaceName}`,
                          ErrorCode.INTERNAL_ERROR);
    }

    this._logger.debug("Fetching ad slices");

    const url = `${this._apiBase}/gamer/ad-space/${id}/region/${region}`;

    const headers = {
      "productKey": this._productKey
    };

    const response: AdvertsResponse = await this._sendGetRequest(url, headers);
    const slices: AdSlice[] = response.map(advert => ({
      url: advert.asset.url
    }));

    if (!this._adSlices.has(adSpaceName)) {
      this._adSlices.set(adSpaceName, new Map<string, AdvertData>());
    }

    const byRegion = this._adSlices.get(adSpaceName);
    if (!byRegion) {
      throw new GameError(`No ads for space with name ${adSpaceName}`,
                          ErrorCode.INTERNAL_ERROR);
    }

    byRegion.set(region, {
      adSlices: slices,
      lastUpdated: (new Date()).getTime()
    });
  }

  private async _fetchAdSpaces() {
    this._logger.debug("Fetching ad spaces");

    const url = `${this._apiBase}/gamer/ad-space`;

    const headers = {
      "productKey": this._productKey
    };

    const adSpaces: AdSpacesResponse = await this._sendGetRequest(url, headers);
    adSpaces.forEach(({ id, name }) => this._adSpaceIds.set(name, id));
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
