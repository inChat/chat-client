// @flow
import EmojiConvertor from 'emoji-js';

export function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function noop() {}

export function getAllUrlParams(url) {
  var queryString = url ? url.split('?')[1] : window.location.search.slice(1);
  var obj = {};
  if (queryString) {
    queryString = queryString.split('#')[0];
    var arr = queryString.split('&');
    for (var i = 0; i < arr.length; i++) {
      var a = arr[i].split('=');
      var paramName = a[0];
      var paramValue = typeof (a[1]) === 'undefined' ? true : a[1];

      //paramName = paramName.toLowerCase(); // why was this here?
      if (typeof paramValue === 'string') paramValue = paramValue.toLowerCase();

      if (paramName.match(/\[(\d+)?\]$/)) {
        var key = paramName.replace(/\[(\d+)?\]/, '');
        if (!obj[key]) obj[key] = [];
        if (paramName.match(/\[\d+\]$/)) {
          var index = /\[(\d+)\]/.exec(paramName)[1];
          obj[key][index] = paramValue;
        } else {
          obj[key].push(paramValue);
        }
      } else {
        if (!obj[paramName]) {
          obj[paramName] = paramValue;
        } else if (obj[paramName] && typeof obj[paramName] === 'string'){
          obj[paramName] = [obj[paramName]];
          obj[paramName].push(paramValue);
        } else {
          obj[paramName].push(paramValue);
        }
      }
    }
  }

  return obj;
}

export function objectToParams(obj) {
  var str = "";
  for (var key in obj) {
      if (str !== "") {
          str += "&";
      }
      str += key + "=" + encodeURIComponent(obj[key]);
  }
  return str;
}

export function handleShortcodes(stickers, message) {
  let match;
  let own = {}.hasOwnProperty;
  const find = /^:(\+1|[-\w]+):$/g // Line starts and ends with `:`

  if ((stickers === null) || (stickers === undefined)){ stickers = {} }
  match = find.exec(message)
  if (match && own.call(stickers, match[1])) {
    message = `![${stickers[match[1]].alt ? stickers[match[1]].alt : ''}](${
        stickers[match[1]].image
      }#sticker${stickers[match[1]].title ? ' "' + stickers[match[1]].title + '"' : ''})`;
  }

  let emoji = new EmojiConvertor();
  emoji.replace_mode = 'unified';
  emoji.allow_native = true;

  return emoji.replace_colons(message);
}

export function convertEmojisToShortcodes(message){
  //Replace unicode to shorcode name e.g. 🎉 -> :tada:
  let emoji = new EmojiConvertor();
  emoji.colons_mode = true;
  return emoji.replace_unified(message);
}

export const dataURItoBlob = (dataURI, callback) => {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1]);
  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], {type: mimeString });
}
