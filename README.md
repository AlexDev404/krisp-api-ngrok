# krisp-api-ngrok
Node module for interacting with 2Hz Krisp API

This module creates local host tunnel using ngrok module.

It creates webhook server on your local machine which is visible to Krisp API.
# Installation
Module can be installed using npm

```npm i krisp-api-ngrok```
# Options
To create instance of Krisp API you should provide options object.

It should have the following minimal structure.
```js
const opts = {
    AccountRID: "", /* Required */
    AccountKey: "", /* Required */
    Port: 3001, /* Optional, default is 3000 */
    Download: true, /* Optional*/
    DownloadDir: "/tmp/", /* Required if Download is present*/
    LogLevel: "info" /*Can be either 'info' or 'error'*/
}
```
When property `Download` is set to `true` all processed files will be downloaded to the provided `DownloadDir` 

# Events
There are 4 main event to listen while using module

| Event| Description|
|------|-------------|
| ready| All Krips API calls should be make after this event.|
| webhook| When response is ready Krisp API triggers this event.
|error| Error event|
|downloads-finished| When all active requests to the api are finished and downloaded this event triggers.
# Methods
All API methods are promises that resolve if Krisp API response status is success otherwise promises reject

| Method| Description|
| ------|-------------|
|denoise| denoises file using given model|
|expand| bandwidth expands using with given model|
|remove| removes resource from Krisp API servers using `rid`|
|stats|  return api usage statistics based on year, day and month|

# Example usage
This example below demonstrates how this module can be used for denoising, recovering and bandwidth expanding file.
```js
const KrispAPI = require("krisp-api-ngrok")
/**
 *  Define options for krisp api
 */
const opts = {
    AccountRID: "",
    AccountKey: "",
    Port: 3001,
    Download: true, // if download is set to true you should also specify DownloadDir where processed files will be downloaded
    DownloadDir: "/tmp/", // directory when processed files should be downloaded
    LogLevel: "info",
}

/**
 * Initialize Krisp API instance with given options
 */
const krispAPI = new KrispAPI(opts)

/**
 * Define unique identifiers for each request
 */
let tokenDenoise = "my-denoise-token"
let tokenExpand= "my-expand-token"
/**
 * All requests to Krisp API should be made after ready event
 */
krispAPI.on("ready", () => {

    /**
     * Make a call to denoise endpoint to process example.wav using DENOISE_PLAY_8000 model and also pass tokenDenoise
     * as argument which will be sent to webhook, it is usefule for identifying requests.
     */
    krispAPI.denoise("example.wav", "DENOISE_PLAY_8000", tokenDenoise)
        .then().catch((d) => {
        console.log("ERROR", d);
    })
    
})

/**
 * Error event should be leistened always.
 */
krispAPI.on("error", (err) => {
    console.log("ERROR");
    console.log(err);
})


/**
 * When Krisp API successfully processes file it triggeres webhook event.
 * All responses from denoise, recover and expand endpoints will come here
 */
krispAPI.on("webhook", (response) => {
    if (response.param === tokenDenoise) {
        //do some fun stuff
    }
})


krispAPI.on("downloads-finished", (rid) => {
    console.log("All downloads have been completed.")
    process.exit(0)
})

```
