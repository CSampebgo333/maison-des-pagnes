import type {Metadata} from './product-seo';
export type EditorialKind='guide'|'story'|'delivery';
export const editorialRoutes:string[];
export function editorialKind(path:string):EditorialKind|null;
export function editorialPath(kind:EditorialKind,language?:string):string;
export function editorialLinks(language?:string):{path:string;label:string}[];
export function editorialMetadata(kind:EditorialKind,language?:string):Metadata;
export function editorialStructuredData(kind:EditorialKind,origin:string|null,language?:string):Record<string,unknown>[];
export function renderEditorialPage(kind:EditorialKind,language?:string):string;
