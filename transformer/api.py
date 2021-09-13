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
    if 'file' not in request.files:
        return '"file" field is not set', 400
    if 'markers' not in request.form:
        return '"markers" field is not set', 400
    try:
        markers = json.loads(request.form["markers"])
    except json.JSONDecodeError:
        return 'Cannot parse "markers" field', 400

    nparr = numpy.frombuffer(request.files['file'].stream.read(), numpy.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    print("Parsed frame")
    # pathlib.Path('/app/stored_frames').mkdir(parents=True, exist_ok=True)
    return analyse_img(frame, list(tuple(marker) for marker in markers))
    # cv2.imwrite('/app/stored_frames/frame.png', frame)
