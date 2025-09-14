/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./context/AppStateContext.jsx":
/*!*************************************!*\
  !*** ./context/AppStateContext.jsx ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   AppStateProvider: () => (/* binding */ AppStateProvider),\n/* harmony export */   useAppState: () => (/* binding */ useAppState)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n\n\nconst AppStateContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)(null);\nfunction AppStateProvider({ children }) {\n    const [selectedSlide, setSelectedSlide] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(0);\n    const [tokenBalance, setTokenBalance] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(0);\n    const value = {\n        selectedSlide,\n        setSelectedSlide,\n        tokenBalance,\n        setTokenBalance\n    };\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(AppStateContext.Provider, {\n        value: value,\n        children: children\n    }, void 0, false, {\n        fileName: \"C:\\\\Users\\\\E-S\\\\Documents\\\\GitHub\\\\invitation-maker\\\\next\\\\context\\\\AppStateContext.jsx\",\n        lineNumber: 17,\n        columnNumber: 5\n    }, this);\n}\nfunction useAppState() {\n    const ctx = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(AppStateContext);\n    if (!ctx) {\n        throw new Error(\"useAppState must be used within an AppStateProvider\");\n    }\n    return ctx;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9jb250ZXh0L0FwcFN0YXRlQ29udGV4dC5qc3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUE0RDtBQUU1RCxNQUFNRyxnQ0FBa0JILG9EQUFhQSxDQUFDO0FBRS9CLFNBQVNJLGlCQUFpQixFQUFFQyxRQUFRLEVBQUU7SUFDM0MsTUFBTSxDQUFDQyxlQUFlQyxpQkFBaUIsR0FBR0wsK0NBQVFBLENBQUM7SUFDbkQsTUFBTSxDQUFDTSxjQUFjQyxnQkFBZ0IsR0FBR1AsK0NBQVFBLENBQUM7SUFFakQsTUFBTVEsUUFBUTtRQUNaSjtRQUNBQztRQUNBQztRQUNBQztJQUNGO0lBRUEscUJBQ0UsOERBQUNOLGdCQUFnQlEsUUFBUTtRQUFDRCxPQUFPQTtrQkFDOUJMOzs7Ozs7QUFHUDtBQUVPLFNBQVNPO0lBQ2QsTUFBTUMsTUFBTVosaURBQVVBLENBQUNFO0lBQ3ZCLElBQUksQ0FBQ1UsS0FBSztRQUNSLE1BQU0sSUFBSUMsTUFBTTtJQUNsQjtJQUNBLE9BQU9EO0FBQ1QiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9pbnZpdGF0aW9uLW1ha2VyLW5leHQvLi9jb250ZXh0L0FwcFN0YXRlQ29udGV4dC5qc3g/ZTk4ZiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVDb250ZXh0LCB1c2VDb250ZXh0LCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcclxuXHJcbmNvbnN0IEFwcFN0YXRlQ29udGV4dCA9IGNyZWF0ZUNvbnRleHQobnVsbCk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gQXBwU3RhdGVQcm92aWRlcih7IGNoaWxkcmVuIH0pIHtcclxuICBjb25zdCBbc2VsZWN0ZWRTbGlkZSwgc2V0U2VsZWN0ZWRTbGlkZV0gPSB1c2VTdGF0ZSgwKTtcclxuICBjb25zdCBbdG9rZW5CYWxhbmNlLCBzZXRUb2tlbkJhbGFuY2VdID0gdXNlU3RhdGUoMCk7XHJcblxyXG4gIGNvbnN0IHZhbHVlID0ge1xyXG4gICAgc2VsZWN0ZWRTbGlkZSxcclxuICAgIHNldFNlbGVjdGVkU2xpZGUsXHJcbiAgICB0b2tlbkJhbGFuY2UsXHJcbiAgICBzZXRUb2tlbkJhbGFuY2UsXHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIChcclxuICAgIDxBcHBTdGF0ZUNvbnRleHQuUHJvdmlkZXIgdmFsdWU9e3ZhbHVlfT5cclxuICAgICAge2NoaWxkcmVufVxyXG4gICAgPC9BcHBTdGF0ZUNvbnRleHQuUHJvdmlkZXI+XHJcbiAgKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVzZUFwcFN0YXRlKCkge1xyXG4gIGNvbnN0IGN0eCA9IHVzZUNvbnRleHQoQXBwU3RhdGVDb250ZXh0KTtcclxuICBpZiAoIWN0eCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCd1c2VBcHBTdGF0ZSBtdXN0IGJlIHVzZWQgd2l0aGluIGFuIEFwcFN0YXRlUHJvdmlkZXInKTtcclxuICB9XHJcbiAgcmV0dXJuIGN0eDtcclxufVxyXG4iXSwibmFtZXMiOlsiY3JlYXRlQ29udGV4dCIsInVzZUNvbnRleHQiLCJ1c2VTdGF0ZSIsIkFwcFN0YXRlQ29udGV4dCIsIkFwcFN0YXRlUHJvdmlkZXIiLCJjaGlsZHJlbiIsInNlbGVjdGVkU2xpZGUiLCJzZXRTZWxlY3RlZFNsaWRlIiwidG9rZW5CYWxhbmNlIiwic2V0VG9rZW5CYWxhbmNlIiwidmFsdWUiLCJQcm92aWRlciIsInVzZUFwcFN0YXRlIiwiY3R4IiwiRXJyb3IiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./context/AppStateContext.jsx\n");

/***/ }),

/***/ "./pages/_app.jsx":
/*!************************!*\
  !*** ./pages/_app.jsx ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ MyApp)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _context_AppStateContext_jsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../context/AppStateContext.jsx */ \"./context/AppStateContext.jsx\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../styles/globals.css */ \"./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_2__);\n\n\n\nfunction MyApp({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_context_AppStateContext_jsx__WEBPACK_IMPORTED_MODULE_1__.AppStateProvider, {\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n            ...pageProps\n        }, void 0, false, {\n            fileName: \"C:\\\\Users\\\\E-S\\\\Documents\\\\GitHub\\\\invitation-maker\\\\next\\\\pages\\\\_app.jsx\",\n            lineNumber: 7,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"C:\\\\Users\\\\E-S\\\\Documents\\\\GitHub\\\\invitation-maker\\\\next\\\\pages\\\\_app.jsx\",\n        lineNumber: 6,\n        columnNumber: 5\n    }, this);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9wYWdlcy9fYXBwLmpzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQWtFO0FBQ25DO0FBRWhCLFNBQVNDLE1BQU0sRUFBRUMsU0FBUyxFQUFFQyxTQUFTLEVBQUU7SUFDcEQscUJBQ0UsOERBQUNILDBFQUFnQkE7a0JBQ2YsNEVBQUNFO1lBQVcsR0FBR0MsU0FBUzs7Ozs7Ozs7Ozs7QUFHOUIiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9pbnZpdGF0aW9uLW1ha2VyLW5leHQvLi9wYWdlcy9fYXBwLmpzeD80Y2IzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFN0YXRlUHJvdmlkZXIgfSBmcm9tICcuLi9jb250ZXh0L0FwcFN0YXRlQ29udGV4dC5qc3gnO1xyXG5pbXBvcnQgJy4uL3N0eWxlcy9nbG9iYWxzLmNzcyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBNeUFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzIH0pIHtcclxuICByZXR1cm4gKFxyXG4gICAgPEFwcFN0YXRlUHJvdmlkZXI+XHJcbiAgICAgIDxDb21wb25lbnQgey4uLnBhZ2VQcm9wc30gLz5cclxuICAgIDwvQXBwU3RhdGVQcm92aWRlcj5cclxuICApO1xyXG59XHJcbiJdLCJuYW1lcyI6WyJBcHBTdGF0ZVByb3ZpZGVyIiwiTXlBcHAiLCJDb21wb25lbnQiLCJwYWdlUHJvcHMiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./pages/_app.jsx\n");

/***/ }),

/***/ "./styles/globals.css":
/*!****************************!*\
  !*** ./styles/globals.css ***!
  \****************************/
/***/ (() => {



/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("./pages/_app.jsx"));
module.exports = __webpack_exports__;

})();