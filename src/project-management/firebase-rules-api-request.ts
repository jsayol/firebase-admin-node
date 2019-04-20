/*!
 * Copyright 2018 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FirebaseApp } from '../firebase-app';
import * as validator from '../utils/validator';
import {
  RequestHandlerBase,
  assertServerResponse,
  InvokeRequestHandlerOptions,
} from './request-handler-base';
import { RulesRelease, RulesetFile } from './rules';
import { FirebaseProjectManagementError } from '../utils/error';
import { HttpMethod } from '../utils/api-request';

/** Project management backend host and port. */
const FIREBASE_RULES_HOST_AND_PORT = 'firebaserules.googleapis.com:443';
/** Project management backend path. */
const FIREBASE_RULES_PATH = '/v1/';

function assertResponseIsRulesetWithFiles(
  responseData: any,
  method: string,
): void {
  assertServerResponse(
    validator.isNonNullObject(responseData),
    responseData,
    `${method}()'s responseData must be a non-null object.`,
  );

  assertServerResponse(
    validator.isNonEmptyString(responseData.name),
    responseData,
    `"responseData.name" field must be a non-empty string in ${method}()'s response data.`,
  );

  assertServerResponse(
    validator.isNonNullObject(responseData.source),
    responseData,
    `"responseData.source" field  must be a non-null object in ${method}()'s response data.`,
  );

  assertServerResponse(
    validator.isArray(responseData.source.files),
    responseData,
    `"responseData.source.files" field  must be an array in ${method}()'s response data.`,
  );
}

export interface ListRulesReleasesResponse {
  releases: RulesReleaseResponse[];
  nextPageToken?: string;
}

export type RulesReleaseResponse = RulesRelease;

export interface ListRulesetsResponse {
  rulesets: RulesetResponse[];
  nextPageToken?: string;
}

export interface RulesetResponse {
  name: string;
  createTime: string;
}

export interface RulesetWithFilesResponse extends RulesetResponse {
  source: {
    files: RulesetFile[];
  };
}

/**
 * Class that provides a mechanism to send requests to the Firebase Rules backend
 * endpoints.
 *
 * @private
 */
export class FirebaseRulesRequestHandler extends RequestHandlerBase {
  protected readonly baseUrl: string = `https://${FIREBASE_RULES_HOST_AND_PORT}${FIREBASE_RULES_PATH}`;

  protected static wrapAndRethrowHttpError(
    errStatusCode: number,
    errText: string,
  ) {
    if (errStatusCode === 429) {
      const errorCode = 'resource-exhausted';
      const errorMessage = 'Quota exceeded for the requested resource.';
      throw new FirebaseProjectManagementError(
        errorCode,
        `${errorMessage} Status code: ${errStatusCode}. Raw server response: "${errText}".`,
      );
    } else {
      return super.wrapAndRethrowHttpError(errStatusCode, errText);
    }
  }

  /**
   * @param app The app used to fetch access tokens to sign API requests.
   * @param resourceName Fully-qualified resource name of the project.
   * @constructor
   */
  constructor(app: FirebaseApp, private resourceName: string) {
    super(app);
  }

  public listRulesReleases(
    filter?: string,
    maxResults?: number,
    nextPageToken?: string,
  ): Promise<ListRulesReleasesResponse> {
    return this.invokeRequestHandler('GET', `${this.resourceName}/releases`, {
      filter,
      maxResults,
      nextPageToken,
    }).then((responseData: ListRulesReleasesResponse) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        "listRulesReleases()'s responseData must be a non-null object.",
      );

      // TODO: when there are no releases, is this an empty array or is the field missing?
      assertServerResponse(
        validator.isArray(responseData.releases),
        responseData,
        `"responseData.releases" field must be an array in listRulesReleases()'s response data.`,
      );

      return responseData;
    });
  }

  public getRulesRelease(name: string): Promise<RulesReleaseResponse> {
    return this.invokeRequestHandler<RulesReleaseResponse>(
      'GET',
      `${this.resourceName}/releases/${name}`,
    ).then((responseData) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        "getRulesRelease()'s responseData must be a non-null object.",
      );

      assertServerResponse(
        validator.isNonEmptyString(responseData.name),
        responseData,
        `"responseData.name" field must be a non-empty string in getRulesRelease()'s response data.`,
      );

      return responseData;
    });
  }

  public createRulesRelease(
    name: string,
    rulesetId: string,
    { isFullRulesetName = false }: { isFullRulesetName?: boolean } = {},
  ): Promise<RulesReleaseResponse> {
    return this.invokeRequestHandler<RulesReleaseResponse>(
      'POST',
      `${this.resourceName}/releases`,
      {
        name: `${this.resourceName}/releases/${name}`,
        rulesetName: isFullRulesetName
          ? rulesetId
          : `${this.resourceName}/rulesets/${rulesetId}`,
      },
    ).then((responseData) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        "createRulesRelease()'s responseData must be a non-null object.",
      );

      assertServerResponse(
        validator.isNonEmptyString(responseData.name),
        responseData,
        `"responseData.name" field must be a non-empty string in createRulesRelease()'s response data.`,
      );

      return responseData;
    });
  }

  public updateRulesRelease(
    name: string,
    rulesetId: string,
    { isFullRulesetName = false }: { isFullRulesetName?: boolean } = {},
  ): Promise<RulesReleaseResponse> {
    return this.invokeRequestHandler<RulesReleaseResponse>(
      'PATCH',
      `${this.resourceName}/releases/${name}`,
      {
        release: {
          name: `${this.resourceName}/releases/${name}`,
          rulesetName: isFullRulesetName
            ? rulesetId
            : `${this.resourceName}/rulesets/${rulesetId}`,
        },
      },
    ).then((responseData) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        "createRulesRelease()'s responseData must be a non-null object.",
      );

      assertServerResponse(
        validator.isNonEmptyString(responseData.name),
        responseData,
        `"responseData.name" field must be a non-empty string in createRulesRelease()'s response data.`,
      );

      return responseData;
    });
  }

  public deleteRulesRelease(name: string): Promise<void> {
    return this.invokeRequestHandler(
      'DELETE',
      `${this.resourceName}/releases/${name}`,
    ).then(() => undefined);
  }

  public listRulesets(
    maxResults?: number,
    nextPageToken?: string,
  ): Promise<ListRulesetsResponse> {
    return this.invokeRequestHandler<ListRulesetsResponse>(
      'GET',
      `${this.resourceName}/rulesets`,
      {
        maxResults,
        nextPageToken,
      },
    ).then((responseData) => {
      assertServerResponse(
        validator.isNonNullObject(responseData),
        responseData,
        "listRulesets()'s responseData must be a non-null object.",
      );

      // TODO: when there are no rulesets, is this an empty array or is the field missing?
      assertServerResponse(
        validator.isArray(responseData.rulesets),
        responseData,
        `"responseData.rulesets" field must be an array in listRulesets()'s response data.`,
      );

      return responseData;
    });
  }

  public getRuleset(
    rulesetId: string,
    { isFullName = false }: { isFullName?: boolean } = {},
  ): Promise<RulesetWithFilesResponse> {
    return this.invokeRequestHandler<RulesetWithFilesResponse>(
      'GET',
      isFullName ? rulesetId : `${this.resourceName}/rulesets/${rulesetId}`,
    ).then((responseData) => {
      assertResponseIsRulesetWithFiles(responseData, 'getRuleset');

      return responseData;
    });
  }

  public createRuleset(
    files: RulesetFile[],
  ): Promise<RulesetWithFilesResponse> {
    return this.invokeRequestHandler<RulesetWithFilesResponse>(
      'POST',
      `${this.resourceName}/rulesets`,
      {
        source: { files },
      },
    ).then((responseData) => {
      assertResponseIsRulesetWithFiles(responseData, 'createRuleset');
      return responseData;
    });
  }

  public deleteRuleset(
    rulesetId: string,
    { isFullName = false }: { isFullName?: boolean } = {},
  ): Promise<void> {
    return this.invokeRequestHandler(
      'DELETE',
      isFullName ? rulesetId : `${this.resourceName}/rulesets/${rulesetId}`,
    ).then(() => undefined);
  }

  protected invokeRequestHandler<T = object>(
    method: HttpMethod,
    path: string,
    requestData: object | string | null = null,
    options?: InvokeRequestHandlerOptions,
  ): Promise<T> {
    return super.invokeRequestHandler(
      method,
      path,
      requestData,
      options,
      FirebaseRulesRequestHandler.wrapAndRethrowHttpError,
    );
  }
}
