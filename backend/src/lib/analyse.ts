import FormData from 'form-data';
import got from 'got';
import { DbManager } from '../database/database';
import { DbImageBoard } from '../database/types';

interface AnalyseImageResult {
  points: [number, number][];
  mm_width: number;
  mm_height: number;
  width: number;
  height: number;
}
type AnalyseImageResponse = Record<number, AnalyseImageResult>;

export default async function analyseImage(
  data: Buffer,
  dbManager: DbManager,
  markers: number[][],
): Promise<DbImageBoard[]> {
  const form = new FormData();
  form.append('file', data);
  form.append('markers', JSON.stringify(markers));
  const response = await got.post<AnalyseImageResponse>('http://transformer/analyse', {
    body: form,
    responseType: 'json',
  });
  return Object.values(response.body).map((value) => {
    const points = value.points.map(([x, y]) => ({ x, y }));
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
}
