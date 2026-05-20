"use strict";

const _ = require("lodash");

const getDataInfo = ({ fields = [], object = {} }) => {
  return _.pick(object, fields);
};

module.exports = {
  getDataInfo,
};
