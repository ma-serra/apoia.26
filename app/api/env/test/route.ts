import { SystemDao } from "@/lib/db/dao"

export async function GET(req: Request) {
    const systemId = await SystemDao.assertSystemId('PDPJ')

    const r: any = {
        pass: undefined,
        tests: [
            {
                name: 'database',
                descr: 'verifica se o banco de dados está acessível',
                pass: !!systemId
            },
        ]
    }

    r.pass = Object.values(r.tests).every(v => v === true)

    return Response.json(r)
}