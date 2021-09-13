import cv2
import numpy

from main import analyse_img

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    raise IOError("Cannot open webcam")

while True:
    _, frame = cap.read()

    cv2.imshow('Input', frame)
    c = cv2.waitKey(1)
    if c == 27:
        break

    results = analyse_img(frame, [(0, 1, 2, 3)])

    for i, result in enumerate(results):
        dst = numpy.array(
            [
                [0, 0],
                [result.width - 1, 0],
                [result.width - 1, result.height - 1],
                [0, result.height - 1]
            ],
            dtype="float32"
        )
        transform = cv2.getPerspectiveTransform(result.points, dst)
        warp = cv2.warpPerspective(frame, transform, (result.width, result.height))
        cv2.imshow('Warped', warp)

cap.release()
cv2.destroyAllWindows()
