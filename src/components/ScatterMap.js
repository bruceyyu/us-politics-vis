import React, { useEffect } from "react";
import * as d3 from "d3";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
var projection;
var dataset_, dataset, extremeVals, colorList, normalizeAttr, attr;
const CONTINUOUS_COLOR_LIST = ["#d0efff", "#03254c"];
const PARTY_COLOR_LIST = ["#cc0000", "#0000cc"];
const PARTY_TEXT_LIST = ["Republican", "Democrat"];
const BALLOT_COLOR_LIST = ["#FFB90F", "#FF6A6A", "#0000FF", "#CD0000", "#828282"];
const BALLOT_TEXT_LIST = [
  "Absentee",
  "Early",
  "Poll Vote",
  "Provisional",
  "No Vote",
];
const OPACITY = 0.7

const ScatterMap = ({ ethnicFilter, attrFilter }) => {
  // load the original dataset and draw the background map at the beginning
  useEffect(() => {
    async function mount() {
      dataset_ = await d3.csv("scatter_map_dataset.csv"); // 之后要从组件外载入
      drawBgMap();
    }
    mount();
  }, []);
  // attribute filter change, redraw the legend and maybe redraw the scatter
  useEffect(() => {
    async function processNewScale() {
      extremeVals = d3.extent(dataset.map((ele) => Number(ele[attr])));
      normalizeAttr = d3
        .scaleLinear()
        .domain([extremeVals[0], extremeVals[1]])
        .range([0, 1]);
    }
    if (dataset_ && attrFilter && attrFilter.length > 0) {
      d3.select("#map").selectAll("svg > circle").remove();
      d3.select("#legend").selectAll("*").remove();
      attr = attrFilter;
      dataset = dataset_.filter((ele) => ele[attr] && ele.long && ele.lat);
      if (attr === "impute_party") {
        colorList = PARTY_COLOR_LIST;
        extremeVals = PARTY_TEXT_LIST;
      } else if (attr.indexOf("BallotType") > -1) {
        colorList = BALLOT_COLOR_LIST;
        extremeVals = BALLOT_TEXT_LIST;
      } else {
        colorList = CONTINUOUS_COLOR_LIST;
        processNewScale();
      }
      drawLegendScale();
      if (ethnicFilter && ethnicFilter.length > 0) {
        drawDots(ethnicFilter);
      }
    }
  }, [attrFilter]);
  // ethnic filter change, clean the map and maybe draw the scatter
  useEffect(() => {
    if (!attr) {
      return
    }
    if (ethnicFilter.length > 0) {
      d3.select("#map").selectAll("svg > circle").remove();
      drawDots(ethnicFilter);
    } else {
      d3.select("#map").selectAll("svg > circle").remove();
    }
  }, [ethnicFilter]);
  return (
    <div style={{ textAlign: "center" }}>
      <svg id="map"></svg>
      <svg id="legend"></svg>
    </div>
  );
};

const drawBgMap = () => {
  var width = (window.innerWidth / 100) * 60;
  var height = (window.innerHeight / 100) * 60;
  projection = geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale([1000]);
  var path = geoPath().projection(projection);
  var svg = d3.select("#map").attr("width", width).attr("height", height);
  d3.json("map-data.json").then((data) => {
    svg
      .selectAll("path")
      .data(feature(data, data.objects.states).features)
      .enter()
      .append("path")
      .attr("d", path)
      .style("stroke", "white")
      .style("stroke-width", "1")
      .style("fill", "rgb(240, 242, 241)");
  });
};

const drawDots = (ethnicFilter) => {
  var colorLevelMap;
  if (attr === "impute_party" || attr.indexOf("BallotType") > -1) {
    colorLevelMap = {};
    extremeVals.forEach((ele, idx) => {
      colorLevelMap[ele] = colorList[idx];
    });
  } else {
    colorLevelMap = d3.interpolateRgb(
      d3.rgb(colorList[0]),
      d3.rgb(colorList[colorList.length - 1])
    );
  }
  d3.select("#map")
    .selectAll("circle")
    .data(dataset.filter((ele) => ethnicFilter.indexOf(ele.race) > -1))
    .enter()
    .append("circle")
    .attr("cx", function (d) {
      return projection([d.long, d.lat])[0];
    })
    .attr("cy", function (d) {
      return projection([d.long, d.lat])[1];
    })
    .attr("r", function (d) {
      return 1.5;
    })
    .style("opacity", OPACITY)
    .style("fill", function (d) {
      if (attr === "impute_party" || attr.indexOf("BallotType") > -1) {
        return colorLevelMap[d[attr]];
      } else {
        return colorLevelMap(normalizeAttr(d[attr]));
      }

      // return d.impute_party === "Democrat" ? "blue" : "red";
    });
};

const drawLegendScale = () => {
  var width = 20;
  var height = 20;

  d3.select("#legend")
    .selectAll("rect")
    .data(colorList)
    .enter()
    .append("rect")
    .attr("x", (d, i) => i * 60)
    .attr("y", 0)
    .attr("height", height)
    .attr("width", width)
    .style("opacity", OPACITY)
    .attr("fill", (d) => d);

  d3.select("#legend")
    .selectAll("txt")
    .data(extremeVals)
    .enter()
    .append("text")
    .text((d) => (typeof d === "number" ? d.toFixed(1) : d))
    .attr("x", (d, i) => i * 60)
    .attr("font-size", 10)
    .attr("y", height + 15);
};

export default ScatterMap;