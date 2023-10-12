let car = {
  age: 123,
  init(){
    console.log(`qwewq ${this.age} fy ${this.ggg}` );
  }
}
// let c = Object.assign({}, car, {ggg: 'asdasd'})
//Наследование функционала
let a = {name: 'свой функционал'}
a.__proto__ = car
//или так
let g = Object.create(car, {name: {
  value: 'свой функционал',
  enumerable: true,
  writable: true,
  configurable: true,
}})


// car.init()
console.dir(a.__proto__ === car);
console.log(g.__proto__ === car);
console.log(car);