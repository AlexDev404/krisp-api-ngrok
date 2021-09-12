const KrispAPI = require("./index.js")

/**
 *  Define options for krisp api
 */
const opts = {
    AccountRID: "AC862165abb795e5fb67a75058a9c81996",
    AccountKey: "f21b428b1299ea61b8fc4ef9160b4878",
    Port: 3001,
    Download: true, // if download is set to true you should also specify DownloadDir where processed files will be downloaded
    DownloadDir: "./", // directory when processed files should be downloaded
    LogLevel: "info"
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
let tokenRecover =  "my-recover-token"
/**
 * All requests to Krisp API should be made after ready event
 */
krispAPI.on("ready", () => {

    /**
     * Make a call to denoise endpoint to process example.wav using DENOISE_PLAY_8000 model and also pass tokenDenoise
     * as argument which will be sent to webhook, it is usefule for identifying requests.
     */
    var glob = require("glob")

    glob("/path/to/wav/files/*.wav", function (er, files) {
        files.map((file)=>{
            krispAPI.denoise(file, "DENOISE_PLAY_16000", tokenDenoise)
            .then((resp)=>{
                //console.log(riesp)
            }).catch((d) => {
                console.log("ERROR", d);
            })   
        })
    }) 

  /* 
    */
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

