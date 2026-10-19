import { notFound } from 'next/navigation';
import { Workspace } from '@/components/workspace';
import { views } from '@/lib/navigation';
export function generateStaticParams(){return views.filter(v=>v.id!=='dashboard').map(v=>({view:v.id}));}
export default async function Page({params}:{params:Promise<{view:string}>}){const {view}=await params;if(!views.some(v=>v.id===view))notFound();return <Workspace view={view}/>;}
