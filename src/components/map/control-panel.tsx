import * as React from "react";
import { useState, useEffect } from "react";
import { fromJS } from "immutable";
import MAP_STYLE from "@/components/map/.style/map-style-basic-v8.json";
import { CategoryType } from "@/graphql/__generated__/graphql";


// includes map styles 
const defaultMapStyle: any = fromJS(MAP_STYLE);
// const defaultMapStyle: any = fromJS(fetch("https://api.maptiler.com/maps/basic-v2/style.json?key=WJYHMjM1keLxRakXKZGa"));
//extract layers
const defaultLayers = defaultMapStyle.get("layers");

const categories = [
  "labels",
  "roads",
  "buildings",
  "parks",
  "water",
  "background",
];
// const categories = defaultLayers.every((item) => { 
//     return (item.id.startsWith('poi-')? item.id : null)
// })

// Layer id patterns by category
// const layerSelector = {
//   background: /Background/,
//   water: /Water/,
//   parks: /Park/,
//   buildings: /Building/,
//   roads: /Bridge|Road|Tunnel/,
//   labels: /Label|Place|poi/,
// };

const layerSelector = categories.map((item)=>{ return {
    [item.substring(3)]: `/${item}/`
}
})

// Layer color class by type
const colorClass = {
  line: "line-color",
  fill: "fill-color",
  background: "background-color",
  symbol: "text-color",
};

function getMapStyle({ visibility, color }) {
  const layers = defaultLayers
    .filter((layer) => {
      const id = layer.get("id");
      return categories.every(
        (name) => visibility[name] || !layerSelector[name].test(id)
      );
    })
    .map((layer) => {
      const id = layer.get("id");
      const type = layer.get("type");
      const category = categories.find((name) => layerSelector[name].test(id));
      if (category && colorClass[type]) {
        return layer.setIn(["paint", colorClass[type]], color[category]);
      }
      return layer;
    });

  return defaultMapStyle.set("layers", layers);
}

function StyleControls({
  onChange,
}: {
  onChange
}) {

    // create initial state
  const visibilityState = layerSelector.map((item) => {
    return {
        [item.name]: true,
    }
  });

  console.log("Visibility State: ", visibilityState);
  const [visibility, setVisibility] = useState(visibilityState
//     {
//     water: true,
//     parks: true,
//     buildings: true,
//     roads: true,
//     labels: true,
//     background: true,
//   }
  );
const colorInitialState = layerSelector.map((item)=>{ return {
    [item.name]: "#ffffff"
}})
  const [color, setColor] = useState(colorInitialState);
    // {
    // water: "#DBE2E6",
    // parks: "#E6EAE9",
    // buildings: "#c0c0c8",
    // roads: "#ffffff",
    // labels: "#78888"a,
    // background: "#EBF0F0",
//   });

  useEffect(() => {
    onChange(getMapStyle({ visibility, color }));
  }, [visibility, color]);

  const onColorChange = (name, value) => {
    setColor({ ...color, [name]: value });
  };

  const onVisibilityChange = (name, value) => {
    setVisibility({ ...visibility, [name]: value });
  };

  return (
    <div className="control-panel">
      <h3>Dynamic Styling</h3>
      <p>
        Dynamically show/hide map layers and change color with Immutable map
        style.
      </p>
      <div className="source-link">
        <a
          href="https://github.com/visgl/react-map-gl/tree/7.1-release/examples/layers"
          target="_new"
        >
          View Code ↗
        </a>
      </div>
      <hr />
      {categories.map((name) => (
        <div key={name} className="input">
          <label>{name}</label>
          <input
            type="checkbox"
            checked={visibility[name]}
            onChange={(evt) => onVisibilityChange(name, evt.target.checked)}
          />
          <input
            type="color"
            value={color[name]}
            disabled={!visibility[name]}
            onChange={(evt) => onColorChange(name, evt.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

export default React.memo(StyleControls);
