from dataclasses import dataclass
from typing import Tuple, Dict
import numpy
import math
import cv2

IntPos = Tuple[int, int]
FloatPos = Tuple[float, float]

Marker = Tuple[numpy.ndarray, numpy.ndarray, numpy.ndarray, numpy.ndarray]


def distance(a, b):
    return math.sqrt(sum(map(lambda x: x ** 2, a - b)))


@dataclass
class ComputeResult:
    points: list[(int, int)]
    mm_width: float
    mm_height: float
    width: int
    height: int


def compute(
    markers: numpy.ndarray,
    marker_size_mm: float,
    offset_mm: float,
) -> ComputeResult:
    offset_scale = offset_mm / marker_size_mm
    top_left = markers[0][0] - (markers[0][2] - markers[0][0]) * offset_scale
    top_right = markers[1][1] - (markers[1][3] - markers[1][1]) * offset_scale
    bottom_right = markers[2][2] - (markers[2][0] - markers[2][2]) * offset_scale
    bottom_left = markers[3][3] - (markers[3][1] - markers[3][3]) * offset_scale
    # cv2.circle(image, tuple(map(int, markers[0][0])), 4, (0, 0, 255), -1)
    # cv2.circle(image, tuple(map(int, top_left)), 4, (255, 0, 255), -1)
    # cv2.circle(image, tuple(map(int, markers[1][1])), 4, (0, 0, 255), -1)
    # cv2.circle(image, tuple(map(int, top_right)), 4, (255, 0, 255), -1)
    # cv2.circle(image, tuple(map(int, markers[2][2])), 4, (0, 0, 255), -1)
    # cv2.circle(image, tuple(map(int, bottom_right)), 4, (255, 0, 255), -1)
    # cv2.circle(image, tuple(map(int, markers[3][3])), 4, (0, 0, 255), -1)
    # cv2.circle(image, tuple(map(int, bottom_left)), 4, (255, 0, 255), -1)
    pixels_width_top = distance(top_right, top_left)
    pixels_width_bottom = distance(bottom_right, bottom_left)
    pixels_height_left = distance(bottom_left, top_left)
    pixels_height_right = distance(bottom_right, top_right)
    marker_pixels_width = (distance(markers[0][1], markers[0][0]) + distance(markers[1][1], markers[1][0])) / 2
    marker_pixels_height = (distance(markers[0][3], markers[0][0]) + distance(markers[3][3], markers[3][0])) / 2
    mm_width = pixels_width_top / marker_pixels_width * marker_size_mm
    mm_height = pixels_height_left / marker_pixels_height * marker_size_mm
    # cv2.circle(image, tuple(map(int, top_left)), int(pixels_width_right), (0, 0, 0), 4)
    # cv2.circle(image, tuple(map(int, top_left)), int(pixels_height_left), (0, 0, 0), 4)
    ratio = mm_width / mm_height
    width = max(max(pixels_width_top, pixels_width_bottom), max(pixels_height_left, pixels_height_right) * ratio)
    height = width / ratio
    return ComputeResult(
        points=list(map(lambda x: x.tolist(), [top_left, top_right, bottom_right, bottom_left])),
        mm_width=mm_width,
        mm_height=mm_height,
        width=int(width),
        height=int(height),
    )


arucoDict = cv2.aruco.Dictionary_get(cv2.aruco.DICT_ARUCO_ORIGINAL)
arucoParams = cv2.aruco.DetectorParameters_create()


def analyse_img(frame, target_ids: list[Tuple[int, int, int, int]]) -> Dict[int, ComputeResult]:
    (corners, ids, rejected) = cv2.aruco.detectMarkers(
        frame,
        arucoDict,
        parameters=arucoParams
    )
    results = {}
    # cv2.aruco.drawDetectedMarkers(frame, corners, ids)
    if len(corners) > 0:
        print(ids.flatten())
        marker_dict = dict(zip(ids.flatten(), corners))
        for i, current_ids in enumerate(target_ids):
            if all(my_id in marker_dict for my_id in current_ids):
                my_corners = list(marker_dict[my_id] for my_id in current_ids)
                results[i] = compute(numpy.reshape(my_corners, (4, 4, 2)), 40, 10)
    return results
