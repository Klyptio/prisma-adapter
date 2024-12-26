import { PrismaClient } from '@prisma/client';
import { Sql, raw } from '@prisma/client/runtime/library';

export interface QueryBuilderOptions {
  model: string;
  select?: Record<string, boolean>;
  include?: Record<string, boolean>;
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  page?: number;
  perPage?: number;
  write?: boolean;
  take?: number;
  skip?: number;
}

export class PrismaQueryBuilder {
  private readonly query: any = {};
  private timeout: number = 30000;
  private isSingle: boolean = false;
  private isCount: boolean = false;

  constructor(
    private readonly client: PrismaClient,
    private readonly options: QueryBuilderOptions
  ) {
    this.query = this.buildBaseQuery();
  }

  private buildBaseQuery() {
    const query: any = {};

    if (this.options.select) query.select = this.options.select;
    if (this.options.include) query.include = this.options.include;
    if (this.options.where) query.where = this.options.where;
    if (this.options.orderBy) query.orderBy = this.options.orderBy;
    if (this.options.take) query.take = this.options.take;
    if (this.options.skip) query.skip = this.options.skip;

    return query;
  }

  select(fields: string[]) {
    this.query.select = fields.reduce<Record<string, boolean>>((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    return this;
  }

  include(relations: string[]) {
    this.query.include = relations.reduce<Record<string, boolean>>((acc, relation) => {
      acc[relation] = true;
      return acc;
    }, {});
    return this;
  }

  where(condition: Record<string, any>) {
    const sanitizedCondition = Object.entries(condition).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: this.sanitizeValue(value)
      }),
      {}
    );

    this.query.where = {
      ...this.query.where,
      ...sanitizedCondition
    };
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc'): this {
    if (!this.query.orderBy) {
      this.query.orderBy = [];
    }
    if (!Array.isArray(this.query.orderBy)) {
      this.query.orderBy = [this.query.orderBy].filter(Boolean);
    }
    this.query.orderBy.push({ [field]: direction });
    return this;
  }

  paginate(page: number, perPage: number) {
    this.query.skip = (page - 1) * perPage;
    this.query.take = perPage;
    return this;
  }

  whereComplex(conditions: Sql) {
    this.query.where = {
      ...this.query.where,
      AND: conditions
    };
    return this;
  }

  async executeRaw(query: string, params: any[] = []): Promise<any> {
    if (!query.trim().toLowerCase().startsWith('select')) {
      throw new Error('Raw queries are limited to SELECT statements for safety');
    }

    this.validateParams(params);

    return Promise.race([
      this.client.$executeRaw`${raw(query)}`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), this.timeout)
      )
    ]);
  }

  private validateParams(params: any[]) {
    for (const param of params) {
      if (typeof param === 'object' && param !== null) {
        throw new Error('Object parameters are not allowed in raw queries');
      }
      if (typeof param === 'string' && param.includes('--')) {
        throw new Error('Potential SQL injection detected');
      }
    }
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return value.replace(/[;'"\\]|--/g, '');
    }
    return value;
  }

  private transformer?: (data: any) => any;

  transform(fn: (data: any) => any) {
    this.transformer = fn;
    return this;
  }

  async execute<T>(): Promise<T | T[] | number> {
    const model = this.client[this.options.model];
    
    if (this.isCount) {
      return model.count(this.query);
    }
    
    if (this.isSingle) {
      return model.findFirst(this.query);
    }
    
    const results = await model.findMany(this.query);
    return this.transformer ? results.map(this.transformer) : results;
  }

  count(): this {
    this.isCount = true;
    return this;
  }

  setTimeout(ms: number) {
    this.timeout = ms;
    return this;
  }

  single(): this {
    this.isSingle = true;
    return this;
  }

  page(pageNumber: number): this {
    this.query.skip = (pageNumber - 1) * (this.query.take || 10);
    return this;
  }

  perPage(limit: number): this {
    this.query.take = limit;
    return this;
  }
}