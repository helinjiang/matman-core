const fs = require('fs');
const fse = require('fs-extra');
// const fse = require('fs-extra');
const path = require('path');
const parserUtil = require('./parser-util');
const fsHandler = require('fs-handler');

const babelD = require('babel-d');

const matmanConfig = {
  handleModulesFolderName: 'handle_modules',
  handlerConfigName: 'config.json',
  handleModuleConfigName: 'config.json',
  targetField: '_m_target'
};

function build(basePath) {
  let result = ['export const isNpm = true;'];

  console.log(basePath, path.basename(basePath));

  //===============================================================
  // 2. 找到配置文件 config.json
  //===============================================================
  const CUR_HANDLER_PATH = basePath;
  const CUR_HANDLER_CONFIG = path.join(CUR_HANDLER_PATH, matmanConfig.handlerConfigName);

  // 注意：handler 的 config.json 可能不存在，此时需要提示错误
  // 它是必须的，用于指导如何匹配路由规则等
  if (!fs.existsSync(CUR_HANDLER_CONFIG)) {
    console.error(CUR_HANDLER_CONFIG + ' is not exist!');
    return null;
  }

  result.push(`import config from './config';`);
  result.push(`export config from './config';`);
  result.push(`export const name = config.name;`);

  let distPath = path.resolve(basePath, '../after');

  // 源码文件先存储一份
  let content = result.join('\n');
  fse.ensureDirSync(distPath);
  fse.outputFileSync(path.join(distPath, 'index.bak'), content);

  // babel 之后的文件存储一份
  let data = babelD.babelCompile.compileByBabel(content);
  fse.outputFileSync(path.join(distPath, 'index2.js'), data.code);
  // console.log(data.code);
}

build(path.resolve(__dirname, '../demo/before'));