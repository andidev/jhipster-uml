#!/usr/bin/env node
'use strict';

if (process.argv.length < 3) {
  throw new ArgumentException(
    'Wrong argument number specified, an input file and (optionally) '
    + "the database type ('sql', 'mongodb' or 'cassandra') must be supplied. \n"
    + "Use the command 'jhipster-uml -help' to see the available commands. \n"
    + 'Exiting now.');
}

var fs = require('fs'),
    EntitiesCreator = require('./lib/entitiescreator'),
    ClassScheduler = require('./lib/scheduler'),
    ParserFactory = require('./lib/editors/parser_factory'),
    jhipsterOptionHelper = require('./lib/helper/jhipster_option_helper'),
    generateEntities = require('./lib/entity_generator');


var type;

// option DTO
var dto = false;
var listDTO = [];
// option force
var force = false;
// option pagination
var paginate = false;
var listPagination = {};

process.argv.forEach(function(val, index) {
  switch(val) {
    case '-db':
      if(!fs.existsSync('./.yo-rc.json') ){
        type = process.argv[index+1];
      }
      break;
    case '-f':
      force = true;
      break;
    case '-dto':
      dto = true;
      break;
    case '-paginate':
      paginate = true;
      break;
    case '-help':
      dislayHelp();
      process.exit(0);
      break;
    default:
  }
});

if (!fs.existsSync('.yo-rc.json') && !type) {
  throw new ArgumentException(
    'The database type must either be supplied with the -db option, '
    + 'or a .yo-rc.json file must exist in the current directory.\n'
    + "Use the command 'jhipster-uml -help' to see the available options."
  );
}

if (fs.existsSync('.yo-rc.json')) {
  type = JSON.parse(
    fs.readFileSync('./.yo-rc.json')
  )['generator-jhipster'].databaseType;
}

try {
  var parser = ParserFactory.createParser(process.argv[2], type);
  var parsedData = parser.parse();

  var scheduler = new ClassScheduler(
    Object.keys(parsedData.classes),
    parsedData.injectedFields
  );

  var scheduledClasses = scheduler.schedule();
  if (parsedData.userClassId) {
    scheduledClasses =
      filterScheduledClasses(parsedData.userClassId, scheduledClasses);
  }

  if(paginate) {
    listPagination = jhipsterOptionHelper.askForPagination(parsedData.classes);
  }

  if(dto) {
    listDTO = jhipsterOptionHelper.askForDTO(parsedData.classes);
  }

  var creator = new EntitiesCreator(
    parsedData,
    parser.databaseTypes,
    listDTO,
    listPagination);

  creator.createEntities();
  if(!force) {
    scheduledClasses = creator.filterOutUnchangedEntities(scheduledClasses);
  }
  creator.writeJSON(scheduledClasses);
  generateEntities(scheduledClasses, parsedData.classes);
} catch (error) {
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}

/**
 * Removes every class corresponding to the class to filter out.
 */
function filterScheduledClasses(classToFilter, scheduledClasses) {
  return scheduledClasses.filter(function(element) {
    return element !== classToFilter;
  });
}

function dislayHelp() {
  console.info(
    'Syntax: jhipster-uml <xmi file> [-options]\n'
    + 'The options are:\n'
    + '\t-db <the database name>\tDefines which database type your app uses;\n'
    + '\t-dto\t[BETA] Generates DTO with MapStruct for the selected entities;\n'
    + '\t-paginate \tChoose your entities\' for pagination.'
  );
}

function ArgumentException(message) {
  this.name = 'ArgumentException';
  this.message = (message || '');
}
ArgumentException.prototype = new Error();
