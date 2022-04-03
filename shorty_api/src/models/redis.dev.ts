import {UrlType, Principal_Types, Permission} from '../types/types.spec'
import {v4 as uuid} from 'uuid'
import { createClient, RedisClientType } from 'redis'


class RedisDb {
  public client: RedisClientType
  constructor(url) {
    this.client = createClient({
      url: url
    })
    this.client.on('error', (err) => console.log('Redis Client Error', err));
    this.client.on('connect', () => console.log('connected'))
  }
  public async initialize() {
    await this.client.connect()
  }
}

let db = new RedisDb('redis://127.0.0.1:6379')
await db.initialize()


const save_url = async (url: UrlType) => {
  await db.client.set(KeyGen.url_by_id(url.id),JSON.stringify(url))
  url.permissions.forEach(async (permission) => {
    await db.client.set(KeyGen.url_by_principal(permission),url.id)
  })
}

const get_owned_urls = async (user: string, groups: Array<string>): Promise<Array<UrlType>>  => {
  let perms: Array<Permission> = groups.map(id =>  ({ type: Principal_Types.Group, id: id, operation: 0 }))
  let u: Permission = { type: Principal_Types.User, id: user, operation: 0 }
  perms.push(u)
  let perm_keys = perms.map((permission) => KeyGen.url_by_principal(permission))

  let url_strings = await Promise.all(perm_keys.map(async (key) => await db.client.get(key)))
  
  console.log(url_strings)
  return []
}

const create_url = (url : UrlType) : string => {
  url['id'] = uuid()
  save_url(url)
  return url.id
}

const patch_url = (url : UrlType) : string => {
  save_url(url)
  return url.id
}

const delete_url = (url: UrlType) => {
  db.client.del(KeyGen.url_by_id(url.id))
  let perm_keys = url.permissions.map((permission) => KeyGen.url_by_principal(permission))
  //db.client.del(perm_keys)
}



// redis key generators
class KeyGen {
  public static url_by_principal (permission: Permission): string {
    return `pri:${permission.type}:${permission.id}/url`
  }
  public static url_by_id (id: string): string {
    return `url:${id}`
  }
}




export default {
  save_url,
  get_owned_urls,
  create_url,
  patch_url,
  delete_url,
}


