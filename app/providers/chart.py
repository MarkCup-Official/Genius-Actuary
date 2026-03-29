from __future__ import annotations

import io
import math

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt

from app.config import AppConfig
from app.schemas.chart import ChartSpec


class MatplotlibChartProvider:
    provider_name = "matplotlib-local"

    def __init__(self, config: AppConfig) -> None:
        self.config = config

    def render(self, spec: ChartSpec) -> tuple[bytes, str]:
        image_format = self.config.chart_image_format
        figure, axis = plt.subplots(figsize=(8, 5))

        if spec.chart_type == "bar":
            x_positions = range(len(spec.labels))
            width = 0.8 / max(len(spec.series), 1)
            for index, series in enumerate(spec.series):
                offsets = [x + (index * width) for x in x_positions]
                axis.bar(offsets, series.values, width=width, label=series.label, color=series.color)
            axis.set_xticks([x + width * (len(spec.series) - 1) / 2 for x in x_positions])
            axis.set_xticklabels(spec.labels)
        elif spec.chart_type == "line":
            for series in spec.series:
                axis.plot(spec.labels, series.values, marker="o", label=series.label, color=series.color)
        elif spec.chart_type == "radar":
            plt.close(figure)
            figure = plt.figure(figsize=(7, 7))
            axis = figure.add_subplot(111, polar=True)
            angles = [n / float(len(spec.labels)) * 2 * math.pi for n in range(len(spec.labels))]
            angles += angles[:1]
            for series in spec.series:
                values = series.values + series.values[:1]
                axis.plot(angles, values, label=series.label, color=series.color)
                axis.fill(angles, values, alpha=0.1, color=series.color)
            axis.set_xticks(angles[:-1])
            axis.set_xticklabels(spec.labels)
        else:
            raise ValueError(f"Unsupported chart type: {spec.chart_type}")

        axis.set_title(spec.title)
        if spec.axes.get("x"):
            axis.set_xlabel(str(spec.axes["x"]))
        if spec.axes.get("y"):
            axis.set_ylabel(str(spec.axes["y"]))
        if spec.series:
            axis.legend()
        figure.tight_layout()

        buffer = io.BytesIO()
        figure.savefig(buffer, format=image_format)
        plt.close(figure)
        return buffer.getvalue(), f"image/{image_format}"
