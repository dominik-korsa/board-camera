import {requireEnv} from "./utils";

const config = {
    port: requireEnv('PORT'),
    mongodbUrl: 'mongodb://mongodb:27017/board-camera',
    storagePath: '/data/images'
}

export default config;
