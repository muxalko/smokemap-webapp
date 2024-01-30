import * as React from "react";
import type { MapboxMap } from "react-map-gl";

export default function Crosshair({ map }: { map?: MapboxMap }) {
  const width = map?.getContainer().clientWidth;
  const height = map?.getContainer().clientHeight;
  const centroid = {
    x: (width || 400) / 2 - 34,
    y: (height || 300) / 2 - 46,
  }; //map.project([width, height]);
  const scale = 1; //2 ** Math.max(0, map.getZoom() - 6);

  // //console.log("width/height:", width, height);
  return (
    <>
      <svg
        width={width}
        height={height}
        // viewBox={`${0} ${0} ${width} ${height}`}
      >
        <g
          key="crosshair"
          transform={`translate(${centroid.x},${centroid.y}) scale(${scale})`}
        >
          <path
            d="M9.484,68.5h59v-59h-59V68.5z M11.484,11.5h55v55h-55V11.5z M77.869,10v1h-8v-1H77.869z M68.286,8h-1V0h1V8z M0.182,10h8v1   h-8V10z M10.765,8h-1V0h1V8z M69.819,67h8v1h-8V67z M67.235,70h1v8h-1V70z M0.131,67h8v1h-8V67z M9.714,70h1v8h-1V70z M13.624,39   l5.127-5.126v10.253L13.624,39z M58.374,33.874L63.5,39l-5.127,5.126V33.874z M39,14.062l5.127,5.127H33.874L39,14.062z    M33.874,58.812h10.254L39,63.938L33.874,58.812z"
            xmlns="http://www.w3.org/2000/svg"
          />
        </g>
      </svg>
    </>
  );
}
