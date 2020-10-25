import AWS = require('aws-sdk');
import {config} from './config/config';

const signedUrlExpireSeconds = 150; // 5 min

// Configure AWS TODO K8 DELETE THE IF?
if (config.aws.aws_profile !== 'DEPLOYED') {
  const credentials = new AWS.SharedIniFileCredentials(
      {profile: config.aws.aws_profile});
  AWS.config.credentials = credentials;
}

export const s3 = new AWS.S3({
  signatureVersion: 'v4',
  region: config.aws.aws_region,
  params: {Bucket: config.aws.aws_media_bucket},
});

/**
 * getSignedUrlToRead generates an aws signed url to retrieve an item.
 * @param {string} key the filename to be put into the s3 bucket.
 * @return {string} an url as a string
 */
export function getSignedUrlToRead(key: string): string {
  if (key) {
    const params = {
      Bucket: config.aws.aws_media_bucket,
      Key: key,
      Expires: signedUrlExpireSeconds,
    };
    const url = s3.getSignedUrl('getObject', params);
    return url;
  }
  return key;
}

/**
 * getSignedUrlToWrite generates an aws signed url to put an item
 * @param {string} key - the filename to be retrieved from s3 bucket
 * @return {string} an url as a string
 */
export function getSignedUrlToWrite(key: string): string {
  const params = {
    Bucket: config.aws.aws_media_bucket,
    Key: key,
    Expires: signedUrlExpireSeconds,
  };
  const url = s3.getSignedUrl('putObject', params);
  return url;
}
