const realDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const literal=value=>value.replace(/[\\%_]/g,'\\$&');
export function orderFilters(url,statuses){
 const status=url.searchParams.get('status')||'',q=(url.searchParams.get('q')||'').trim().slice(0,100),city=(url.searchParams.get('city')||'').trim().slice(0,80),from=url.searchParams.get('from')||'',to=url.searchParams.get('to')||'';
 if(status&&!Object.hasOwn(statuses,status))throw Error('Statut invalide.');
 if(from&&!realDate(from)||to&&!realDate(to)||from&&to&&from>to)throw Error('Vérifiez la période de recherche.');
 const parts=[],args=[];
 if(status){parts.push('status=?');args.push(status);}
 if(q){parts.push("(reference LIKE ? ESCAPE '\\' OR customer LIKE ? ESCAPE '\\')");args.push('%'+literal(q)+'%','%'+literal(q)+'%');}
 if(city){parts.push("json_extract(customer,'$.city') LIKE ? ESCAPE '\\'");args.push('%'+literal(city)+'%');}
 if(from){parts.push('created_at>=?');args.push(from+'T00:00:00.000Z');}
 if(to){parts.push('created_at<=?');args.push(to+'T23:59:59.999Z');}
 return {where:parts.length?' WHERE '+parts.join(' AND '):'',args};
}
export function csvCell(value){let s=String(value??'');if(/^\s*[=+@-]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
