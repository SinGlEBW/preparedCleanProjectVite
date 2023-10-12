// let subscribersEvents: SubscribersEventsType = {
//   'msg': [],
//   'status': []
// };
// let setStatus = (status) => {};

import { uuid4 } from '@utils/helpers';

// let ws: WebSocket;
// let url = process.env.REACT_APP_URL_WS as string;

// let arrSaveReq: any;

let saveDataSend = '';

export class WsApi {
  static statusConnect = '';
  static idTimeoutSend;
  static subscribersEvents:SubscribersEventsType = {
    'msg': [],
    'status': []
  };
  static readonly options = {}
  static timeout = 0;

  private static configWs = {
    timeReConnect: 5000
  }
  private static isDisconnect = true;
  static ws:WebSocket | null;
  static url = process.env.REACT_APP_URL_WS as string;
  private static isRequestArrSaveReq = false
  private static totalInfoReqPromise:{action: string, reqId: string, resolve:any, reject: any}[] = [];
  static arrSaveReq:any[] = [];

  private static setStatus = (status) => {};
 

 

  static getEndReq = () => WsApi.arrSaveReq;
  static on<T>(eventName:EventNameType, cb: SubscriberType<T>) {
    WsApi.subscribersEvents[eventName].push(cb);
    return () => {
      WsApi.subscribersEvents[eventName] = WsApi.subscribersEvents[eventName].filter((s) => s !== cb) 
    }
  }

  static off<T>(eventName:EventNameType, cb: SubscriberType<T>) {
    WsApi.subscribersEvents[eventName] = WsApi.subscribersEvents[eventName].filter((s) => s !== cb) 
  }

  static watchStatusConnect (cb) {
    WsApi.setStatus = (status) => {
      WsApi.statusConnect = status;
      cb(status)
    };
  }
 
  static getTimeRequest () {
    //TODO: придумать как получить время запроса. Нужно ориентироваться на action ответа что бы понимать ответ данного сообщения
  }

  static watchIsTimeoutConnect (cb, timeout) {
    
    WsApi.timeout = timeout;
    let idTimeout = setTimeout(() => {
      if(WsApi.statusConnect === 'ready'){
        cb(false);
        clearTimeout(idTimeout);
      }else{
        cb(true);
      }
    }, WsApi.timeout);

  }

  static connect(option = WsApi.configWs) {
    WsApi.isDisconnect = false;
    WsApi.configWs = option;
    WsApi.removeEvent();
    WsApi.idTimeoutSend && clearTimeout(WsApi.idTimeoutSend);
    WsApi.ws = new WebSocket(WsApi.url);
    
    WsApi.setStatus('pending');
    WsApi.ws.addEventListener('open', WsApi.openHandler);
    WsApi.ws.addEventListener('close', WsApi.closeHandler);
    WsApi.ws.addEventListener('message', WsApi.msgHandler);
    WsApi.ws.addEventListener('error', WsApi.errHandler);


    return WsApi.ws;
  }

  static disconnect() {   console.log('DISCONNECT WS');
    WsApi.isDisconnect = true;
    WsApi.ws?.close();
    WsApi.removeEvent();
    WsApi.idTimeoutSend && clearTimeout(WsApi.idTimeoutSend);
    for(let key in WsApi.subscribersEvents){ WsApi.subscribersEvents[key] = []; }
    WsApi.arrSaveReq = [];
    WsApi.ws = null
  }

  static send(data: object) {  console.log('send: ', data);
    return new Promise((resolve, reject) => {
      let {action, ...payload} = data as any;
      /*FIXME: Нужно слать id запроса, после ответ искать по id,
        потому что может быть запрошено несколько 
      */
   
          /* 0	CONNECTING, 1	OPEN, 2	CLOSING, 3	CLOSED  */
    // console.log('WsApi.arrSaveReq >>', WsApi.arrSaveReq);
    // console.log('WsApi.ws.readyState >> ', WsApi.ws.readyState);
    /*
      INFO: Проверить как реагирует что происходит  
    */
    if(!WsApi.ws || WsApi.ws.readyState !== 1){//
      if(!WsApi.arrSaveReq.some((item) => item.action === (data as any).action)){
        WsApi.arrSaveReq.push(data);
        console.log('сохранили запрос в arrSaveReq: ', WsApi.arrSaveReq);
      }
      return;
    }

    let reqId = uuid4();
    WsApi.totalInfoReqPromise.push({action, reqId, resolve, reject})
    WsApi.ws.send(JSON.stringify(data));

    if(WsApi.arrSaveReq.length && !WsApi.isRequestArrSaveReq){
      WsApi.isRequestArrSaveReq = true;
      WsApi.arrSaveReq.forEach((saveData) => {
        let id = setTimeout(() => {
          clearTimeout(id);
          // WsApi.ws.send(JSON.stringify(saveData));
        }, 1000)
      })
    }
   
    // if(saveDataSend){ console.log('saveDataSend: ', saveDataSend);
    //   WsApi.ws.send(JSON.stringify(saveDataSend));
    //   saveDataSend = '';
    // }
    // WsApi.arrSaveReq = msg;
    })
  }


  private static removeEvent() {
    WsApi.ws?.removeEventListener('open', WsApi.openHandler);
    WsApi.ws?.removeEventListener('close', WsApi.closeHandler);
    WsApi.ws?.removeEventListener('message', WsApi.msgHandler);
    WsApi.ws?.removeEventListener('error', WsApi.errHandler); 
  }

  private static openHandler() {  console.log('WsApi >> open');
    WsApi.setStatus('ready');
  }

  private static closeHandler() { console.log('WsApi >> close (WsApi.arrSaveReq)', WsApi.arrSaveReq);
    WsApi.setStatus('close');
    if(!WsApi.isDisconnect){
      WsApi.reConnect();
    }

  }
  private static reConnect() { console.dir('reConnect');
    WsApi.startActionEvery(
      () => {
        console.log('startActionEvery (WsApi.statusConnect)', WsApi.statusConnect);
        if(WsApi.statusConnect === 'ready'){
          return true;
        }
        WsApi.connect()
        return false;

      },
      {interval: WsApi.configWs.timeReConnect}
    )
  }
  private static msgHandler(e) {  
    //TODO: 
    let data = JSON.parse(e.data ? e.data : "{}");
    
    if('action' in data && WsApi.arrSaveReq.length){
      let findInx = WsApi.arrSaveReq.findIndex((item) => item.action === data.action)
      if(~findInx) WsApi.arrSaveReq.splice(findInx, 1);

    }
    if(!WsApi.arrSaveReq.length && WsApi.isRequestArrSaveReq) WsApi.isRequestArrSaveReq = false;

    try {
      let { action } = data;
     
      //FIXME: Пока ориентируемся по action. Нужно на сервер отсылать reqId и получать для точного ориентира промисов
      let editTotalInfoReqPromise:any[] = [];
      for (let i = 0; i < WsApi.totalInfoReqPromise.length; i++) {
        const itemReq = WsApi.totalInfoReqPromise[i];
        if(itemReq.action !== action) {
          editTotalInfoReqPromise.push(itemReq);
        }else{
          itemReq.resolve && itemReq.resolve(data)
        }
      }
      WsApi.totalInfoReqPromise = editTotalInfoReqPromise;

      WsApi.subscribersEvents['msg'].forEach((s) => s(data));
    } catch (error) {
      WsApi.subscribersEvents['msg'].forEach((s) => s(JSON.parse("{}")));
    }
  }
  private static errHandler(err) {  console.log('WsApi >> err');
    WsApi.setStatus('error');
  }

  private static startActionEvery = (cb, config:{interval: number,rejectCutoff?: number} = {interval: 5000}) => {
    return new Promise((resolve, reject) => {
      /*
        INFO: interval - переодичность с которой отрабатывает cb до тех пор пока cb не вернёт true
                         и тогда отработает then.

              rejectCutoff - в случае заданного interval мы ждём когда вернёт cb true, этот параметр задаёт отсечку по времени
                             спустя которое cb перестанет вызываться даже если true не будет. Отработает в таком случае reject
                             
      */
      let countInterval = 0;
      let idInterval = setInterval(() => {
        countInterval += config.interval;
    
        if(config?.rejectCutoff && countInterval > config.rejectCutoff){
          clearInterval(idInterval);
          reject({status: false, msg: Error(`Время загрузки ${config.rejectCutoff / 60000} мин истекло`)});
          return;
        }
  
        let stop = cb();
        if(stop){
          resolve({status: true, msg: 'cb вернул true'})
          clearInterval(idInterval);
        }
      }, config.interval < 200 ? 200 : config.interval)

    })

    
  }
}


type SubscriberType<T> = (msg: T) => void;

export type WSStatus = 'pending' | 'ready' | 'error' | 'close'; 
export type EventNameType = 'msg' | 'status';
export type SubscribersEventsType = Record<EventNameType, any[]>

// (window as any).SB = subscribersEvents;
(window as any).WsApi = WsApi;
