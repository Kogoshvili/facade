"use strict";

const React = {};
React.createElement = function (element = 'div', props = {}, children = []) {


};

function Test() {
  var handleClick = function handleClick() {
    return console.log('hello');
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: function onClick() {
      return handleClick;
    }
  });
}

Test();
