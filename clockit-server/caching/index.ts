import { ICache } from "./iCache";
import { MemCache } from "./memCache";
import { RedisCache } from "./redisCache";

export class Cachier {
    private static instance: Cachier;
    private cache: ICache;
    private constructor(cache: ICache) {
        this.cache = cache;
    }
    static getInstance(cache?: ICache): Cachier {
        if (!Cachier.instance) {
            try{
                Cachier.instance = new Cachier(cache ?? new RedisCache());
            }catch {
                Cachier.instance = new Cachier(cache ?? new MemCache());
            }
        }
        return Cachier.instance;
    }
    getCache(): ICache {
        return this.cache;
    }
}