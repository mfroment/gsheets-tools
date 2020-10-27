/* Google Sheets: Mem
   Store data for later reuse. Data can be ranges (in which case use is similar to a named range, defined on the fly)
   or results of calculations (incl. array formulae). 
   Similar to named ranges, except "variables" are defined and accessed via calling the add-on formulae in the sheet.
*/

// TODO: serialize/deserialize errors (possibly infeasible due not being able to returning specific errors + in specific cells)
// TODO: investigate apparent calculation order bug w.r.t. memList() (obs seems ignored/optimized away)
// TODO: add ticker counter to force downstream recalculation (and possibly help with above)

// NOTE: apparently no way to get calling range (a la Xl Application.Caller)
// NOTE: apparently no way to return specific errors
// NOTE: using CacheService for session global storage purpose is not ideal (risk of null returns)

// Add-on helpers

/* StorageCache class 
   Helper class to wrap/unwrap storing data to the document cache.
*/

const StorageCache = class {
  constructor() {
    this.storage_ = CacheService.getDocumentCache();
  }

  list() {
    const jsonIdList = this.storage_.get(this.constructor.list_);
    return JSON.parse(jsonIdList);
  }
  
  get(id) {
    const jsonData = this.storage_.get(this.constructor.id_(id)); 
    return JSON.parse(jsonData);
  }
  
  put(id, data) {
    if (! this.constructor.validId_(id)) {
      throw new Error("Id must not end with a dot followed by a number (e.g. var.18)");
    }    
    const jsonData = JSON.stringify(data);
    this.storage_.put(this.constructor.id_(id), jsonData);
    this.idListAdd_(id);
    
    return id;
  }
  
  delete(id) {
    this.storage_.remove(this.constructor.id_(id));
    this.idListDelete_(id);    

    return true;
  }

  deleteAll() {
    const idList = this.list();
    idList.forEach((id) => this.storage_.remove(this.constructor.id_(id)));
    this.idListDeleteAll_();

    return true;
  }
  
  // private methods
  static get prefix_() { return "mem_ad" };

  static id_(id) {
    return `${this.prefix_}.data.${id}`;
  }

  static validId_(id) {
    return !(/\.\d+$/.test(id));
  }
  
  static get list_() {
    return `${this.prefix_}.list`;
  }
  
  idListAdd_(id) {
    let idList = this.list();
    if (Array.isArray(idList)) {
      if (idList.indexOf(id) === -1) {
        idList.push(id);
      }
    } else {
      idList = [id];
    }
    const jsonIdList = JSON.stringify(idList);
    this.storage_.put(this.constructor.list_, jsonIdList);
  }
  
  idListDelete_(id) {
    let idList = this.list();
    if (Array.isArray(idList)) {
      const i = idList.indexOf(id);
      if (i !== -1) {
        idList.splice(i, 1);
      }
    } else {
      idList = [];
    }
    const jsonIdList = JSON.stringify(idList);
    this.storage_.put(this.constructor.list_, jsonIdList);
  }
  
  idListDeleteAll_() {
    this.storage_.put(this.constructor.list_, JSON.stringify([]));
  }
}

const storage_ = new StorageCache();

// Add-on custom functions

/**
 * [Mem] Stores input data.
 *
 * @return Id of stored data
 * @param {number|Array<Array<number>>} data Input data (value, range, etc)
 * @customfunction
 */
const memPut = (id, data) => {  
  return storage_.put(id, data);
}

/**
 * [Mem] Retrieves stored data.
 *
 * @return {number|Array<Array<number>>} Stored data
 * @param {string} id Id of stored data 
 * @customfunction
 */
const memGet = (id) => {
  return storage_.get(id);
}

/**
 * [Mem] List stored data ids.
 *
 * @return {<Array<string>} Stored data ids
 * @param obs Optional range, change triggers recalculation.
 * @customfunction
 */
const memList = (obs=null) => {
  return storage_.list();
}

/**
 * [Mem] List stored data ids.
 *
 * @param {string} id Id of stored data 
 * @return 
 * @customfunction
 */
const memDelete = (id=null) => {
  id==null ? storage_.deleteAll() : storage_.delete(id);
  
  return `Deleted${id == null ? "" : ` ${id}`}`;
}
