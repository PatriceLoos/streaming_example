const { Transform, finished } = require("stream");

const InputKey=['Project Title', 'City', 'State', 'ZIP', 'Award','Location'];
const state = {count:0,i:0,obj:{},award:{}};

const handler = (err) => { console.log(err) };

// separating csv elements.
const extractCell = new Transform({
  readableObjectMode: true,
  transform(chunk, encoding, callback) {
    let inQuotes = false;
    str =  chunk
        .toString()
        .trim()
        .split("\"");
    str.forEach(quotedStr => {
        if (inQuotes) {
            this.push(quotedStr.replace(/\n/g,""));
            inQuotes = false;
        }
        else{
            subr = quotedStr.split("\n").toString().split(",");
            subr.forEach(element => {
                if (element != ""){
                    this.push(element);
                }
            })
            inQuotes = true;
        }
    });
    callback();
  }
});
extractCell.on('error', handler);

// group individual row elements of the csv file in objects
const cellToObject = new Transform({
  readableObjectMode: true,
  transform(chunk, encoding, callback) {
    str = chunk.toString();
    state.obj[InputKey[state.i]] = str;    
    state.i++;

    if (state.i >= InputKey.length) {
      if (state.count > 0){
        this.push(state.obj);
      }
      state.obj = {};
      state.i = 0;
      state.count++;
    }
    callback();
  }
});
cellToObject.on('error', handler);

const objectToString = new Transform({
  writableObjectMode: true,
  transform(chunk, encoding, callback) {
    this.push(JSON.stringify(chunk) + "\n");
    callback();
  }
});
objectToString.on('error', handler);

// transform the input object to the spec format with awards tally
const processObject = new Transform({
  readableObjectMode: true,
  writableObjectMode: true,
  transform(chunk, encoding, callback) {
    // tally award
    const award = getAwardType(chunk.Award);
    if (award in state.award){
      state.award[award]++;
    }
    else {
      state.award[award] = 1;
    }
    coordinate = getCoordinate(chunk.Location);

    this.push({
      award: chunk.Award,
      award_totals: state.award,
      city: chunk.City,
      latitude: coordinate.lat,
      longitude: coordinate.long,
      project: chunk['Project Title'],
      state: chunk.State,
      zip: chunk.ZIP
    });

    callback();
  }
})
processObject.on('error', handler);

const getAwardType = (hashAward) => {
  const awardValue = Number(hashAward.substring(hashAward.toLowerCase().lastIndexOf('x')+1));
  if (Number.isNaN(awardValue))
    throw "Award hash is not a valid number.";
  return awardValue%10;
}

// find the coordinate in parentesis and return them as float lat and long
const getCoordinate = (location) => {
  const regExp = /\(([^)]+)\)/;
  const inParentesis = regExp.exec(location)[1];
  let coordArr = inParentesis.split(",");

  if (!coordArr || coordArr.length < 2)
    throw "Location is missing coordinates.";
  
  coordArr = coordArr.slice(0,2).map(x => {
    if (Number.isNaN(Number.parseFloat(x)) )
      throw "Coordinate value not valid number.";
    return Number.parseFloat(x);
  });

  return {lat:coordArr[0],long:coordArr[1]};
}

process.stdin  
  .pipe(extractCell)
  .pipe(cellToObject)
  .pipe(processObject)
  .pipe(objectToString)
  .pipe(process.stdout);

  

