const EventEmitter = require('events');
const ngrok = require('ngrok');
const request = require("request");
const fs = require("fs")
const http = require("http")
const https = require("https")
const express = require('express')
const bodyParser = require("body-parser")
const winston = require("winston");


const myCustomLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
    },
    colors: {
        error: "red",
        warn: "yellow",
        info: "green",
    }
};


class KrispApi extends EventEmitter {
    constructor(opts) {
        super();
        if (Object.keys(myCustomLevels.levels).indexOf(opts.LogLevel) < 0) opts.LogLevel = "info"

        this.log = winston.createLogger({
            level: opts.LogLevel,
            format: winston.format.json(),
            transports: [
                //
                // - Write to all logs with level `info` and below to `combined.log`
                // - Write all logs error (and below) to `error.log`.
                //
                new winston.transports.Console({
                    format: winston.format.combine(winston.format.colorize(), winston.format.simple())
                })
            ]
        });


        this.registerEventListeners()

        this.api_url = "https://api.2hz.ai/v2";
        if (!opts.AccountRID) this.emit("error", new Error("AccountRID is required"))
        if (!opts.AccountKey) this.emit("error", new Error("AccountKey is required"))
        this.AccountRID = opts.AccountRID
        this.AccountKey = opts.AccountKey

        this.port = opts.Port || 3000
        this.download = opts.Download
        if (this.download && !opts.DownloadDir) this.emit("error", new Error("DownloadDir is required if Download is set to true"))
        this.downloadDir = opts.DownloadDir

        this.totalFiles = 0;
        this.totalDownloaded = 0;
        this.configureWebhook()


    }

    configureWebhook() {

        (async () => {
            try {
                this.log.info("Configuring webhook and localhost tunnel.")
                this.webhook = await ngrok.connect(this.port);
                this.emit("configured")
            } catch (e) {
                this.log.error(`Error happened while configuring webhook, message:  ${e.message}`)
                this.emit("error", e);
            }
        })()
    }
    
    async denoise(file, model, param = "default") {
        return this.callService("denoise", file, model, param)
    }

    async expand(file, model, param = "default") {
        return this.callService("expand", file, model, param)
    }

    async remove(rid) {
        return new Promise((resolve, reject) => {
            request.delete({
                url: `${this.api_url}/recording/${rid}`,
                headers:
                    {
                        "Authorization": `Basic ${this.AccountRID}:${this.AccountKey}`
                    }
            }, (err, httpResponse, body) => {
                if (err) {
                    return reject(err)
                } else {
                    try {
                        body = JSON.parse(body)
                        if (body.code === 0) {
                            return resolve(body)
                        } else {
                            return reject(body)
                        }
                    } catch (e) {
                        return reject(e)
                    }
                }
            });
        })
    }


    async stats(year = "2018", month = "*", day = "*") {
        return new Promise((resolve, reject) => {
            request.get({
                url: `${this.api_url}/account/stat/${year}/${month}/${day}`,
                headers:
                    {
                        "Authorization": `Basic ${this.AccountRID}:${this.AccountKey}`
                    }
            }, (err, httpResponse, body) => {
                if (err) {
                    this.log.error(`Error happened while calling API, message: ${err.message}`)
                    return reject(err)
                } else {
                    try {
                        body = JSON.parse(body)
                        if (body.code === 0) {
                            return resolve(body)
                        } else {
                            return reject(body)
                        }
                    } catch (e) {
                        this.log.error(`Error happened while calling API, message: ${e.message}`)
                        return reject(e)
                    }
                }
            });
        })
    }


    callService(service, file, model, param) {


        this.log.info(`Calling service ${service} with model ${model}`)
        const formData = {
            // Pass a simple key-value pair
            modelName: model,
            // Pass data via Buffers
            webhook: this.webhook,
            param: param,
            // Pass data via Streams
            file: fs.createReadStream(file),
        };

        return new Promise((resolve, reject) => {
            request.post({
                url: `${this.api_url}/se/${service}/file/`,
                formData: formData,
                gzip: true,
                headers:
                    {
                        "Authorization": `Basic ${this.AccountRID}:${this.AccountKey}`
                    }
            }, (err, httpResponse, body) => {
                if (err) {
                    this.log.error(`Error happened while calling API, message: ${err.message}`)
                    return reject(err)
                } else {
                    try {
                        body = JSON.parse(body)
                        if (body.code !== 0) return reject(body)
                        return resolve(body)
                    } catch (e) {
                        this.log.error(`Error happened while calling API, message: ${e.message}`)
                        return reject(e)
                    }
                }
            });
        })

    }


    downloadAudios(audios) {
        const allowedKeys = ["bandwidth_expanded", "noise_suppressed"]
        Object.keys(audios).map((key) => {
            if (key !== "original") {
                let url = audios[key]["url"]

                this.totalFiles++;

                this.log.info(`Downloading audio with rid ${audios[key]["rid"]}`);

                let file = fs.createWriteStream(`${this.downloadDir}/${audios[key]["rid"]}.wav`);
                let request = https.get(url, (response) => {
                    // console.this.log("piping to file");
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        this.log.info(`Audio with rid ${audios[key]["rid"]} downloaded successfully`)
                        this.totalDownloaded++;

                        if (this.totalFiles === this.totalDownloaded) {
    //                        this.emit("downloads-finished", audios[key].rid)
                        }

                    });
                });
            }
        });

    }

    registerEventListeners() {
        this.on("configured", () => {
            this.app = express()

            this.app.listen(this.port, () => {
                this.emit("ready")
            })
            this.app.use(bodyParser.urlencoded({extended: true, limit: '200mb', parameterLimit: 1000000}));
            this.app.use(bodyParser.json({limit: '200mb'}));

            this.app.post('/', (req, res) => {
                this.emit("webhook", req.body)
                res.status(200).end()
            })

        })

        /**
         * Event ready triggers when webhook server is up and running, and if required ngrok connection is established
         */
        this.on("ready", () => {
        })

        /**
         * webhook event triggeres when there is a ready reponse from api
         */
        this.on("webhook", (response) => {
            if (this.download) {
                this.downloadAudios(response.audios)
            }
        })


    }

    async disconnect(){
        await ngrok.disconnect()
    }
}

module.exports = KrispApi
