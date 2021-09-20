import json
import numpy
from flask import Flask, request
import cv2

from main import analyse_img

app = Flask(__name__)


@app.route('/')
def hello_world():
  return 'Hello, Docker!'


@app.route('/analyse', methods=['POST'])
def analyse():
  app.logger.info("Request to /analyse made")
  if 'file' not in request.files:
    if 'file' in request.form:
      app.logger.info('"file" field set in form instead of files')
      return '"file" field set in form instead of files', 400
    else:
      app.logger.info('"file" field is not set')
      return '"file" field is not set', 400
  if 'markers' not in request.form:
    app.logger.info('"markers" field is not set')
    return '"markers" field is not set', 400
  try:
    markers = json.loads(request.form["markers"])
  except json.JSONDecodeError:
    app.logger.info('Cannot parse "markers" field')
    return 'Cannot parse "markers" field', 400

  nparr = numpy.frombuffer(request.files['file'].stream.read(), numpy.uint8)
  frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
  print("Parsed frame")
  # pathlib.Path('/app/stored_frames').mkdir(parents=True, exist_ok=True)
  return analyse_img(frame, list(tuple(marker) for marker in markers))
  # cv2.imwrite('/app/stored_frames/frame.png', frame)


if __name__ == '__main__':
  app.run('0.0.0.0', 80, debug=True)
  app.logger.info("Ready!")
