import { ObjectId } from "mongodb";
import FormData from "form-data";
import got from "got";
import { DbManager } from "../database/database";
import * as fs from "fs";
import { DbImageBoard } from "../database/types";

interface AnalyseImageResult {
    points: [number, number][];
    mm_width: number;
    mm_height: number;
    width: number;
    height: number;
}
type AnalyseImageResponse = Record<number, AnalyseImageResult>

export default async function analyseImage(
    id: ObjectId,
    dbManager: DbManager,
    markers: number[][],
) {
    const image = await dbManager.imagesCollection.findOne(id);
    if (!image) throw new Error('Image not found');
    const form = new FormData();
    form.append('file', fs.createReadStream(image.path));
    form.append('markers', JSON.stringify(markers));
    const response = await got.post<AnalyseImageResponse>('http://transformer/analyse', {
        body: form,
        responseType: 'json',
    });
    const boards: DbImageBoard[] = Object.values(response.body).map((value) => {
        const points = value.points.map(([x, y]) => ({x, y}))
        return ({
            topLeft: points[0],
            topRight: points[1],
            bottomRight: points[2],
            bottomLeft: points[3],
            mmHeight: value.mm_height,
            mmWidth: value.mm_width,
            ratio: value.width / value.height,
        });
    });
    console.log(boards);
    await dbManager.imagesCollection.updateOne({_id: id,}, {
        $set: {
            boards,
        }
    })
    response.body
}
