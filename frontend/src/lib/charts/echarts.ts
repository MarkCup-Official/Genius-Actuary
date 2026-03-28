import * as echarts from 'echarts/core'
import {
  BarChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
} from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  VisualMapComponent,
  DataZoomComponent,
  ToolboxComponent,
  LineChart,
  BarChart,
  ScatterChart,
  RadarChart,
  HeatmapChart,
  PieChart,
  CanvasRenderer,
])

export const graphic = echarts.graphic

export { echarts }
