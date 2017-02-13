const _locks = [];

const add = (data) => {
  const key = `${data.type}-${data.item}`;
  _locks[key] = true;
  console.log('Locked: ', key);
};

const remove = (data) => {
  const key = `${data.type}-${data.item}`;
  _locks[key] = false;
  console.log('Unlocked: ', key);
};

const isLocked = (model, id) => {
  const key = `${model}-${id}`;
  return _locks[key];
};

module.exports = {
  add, remove, isLocked
};
