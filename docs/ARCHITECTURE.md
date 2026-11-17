# ARCHITECTURE

## Web App

the web app is an authenticated control panel dashboard

what each role (employee, admin) can do:

| action | employee | admin |
|---|---|---|
| login | yes | yes |
| list employees | yes (only active ones) | yes (active and fired/inactive ones) |
| see name, job title and department | yes | yes |
| see corporate email and phone | yes | yes |
| see wage, cpf, personal phone and address | no (only their own) | yes |
| register / edit employees | no | yes |
| fire employees | no | yes |

Idea (rn):

```
[Angular]                      [NODE API]                  [REDIS]           [POSTGRESQL]
    |                               |                         |                   | 
    |-1. POST /auth/login---------->|                         |                   |
    |                               |-- 2. search user/hash-->|------------------>|
    |                               |<--3. return data--------|-------------------|
    |                               |                         |                   |
    |                               |--4. save jwt id ------->|                   |
    |<--5. return JWT---------------|                         |                   |
    |                               |                         |                   |
    |-- 6. GET /employees---------->|                         |                   |
    |    (auth bearer)              |--7. active token?------>|                   |
    |                               |<-8. ok role VIEWER------|                   |
    |                               |--9. public SELECT------>|------------------>|
    |                               |<-10. filtered data------|<------------------|
    |<-11. JSON (no wage/CPF)-------|                         |                   |

```

use cases:

```mermaid
flowchart LR
    employee["employee"]
    admin["admin"]
    admin -- "is a" --> employee

    subgraph system["employee control panel"]
        login(["login"])
        issue(["issue jwt"])
        store(["store jwt id in redis"])
        validate(["validate token"])
        checkrole(["check role (rbac)"])

        list(["list employees"])
        inactive(["list fired / inactive employees"])
        own(["see their own sensitive data"])
        allsens(["see everyone's sensitive data"])
        register(["register employee"])
        edit(["edit employee"])
        fire(["fire employee"])
    end

    employee --- login
    employee --- list
    employee --- own
    admin --- allsens
    admin --- inactive
    admin --- register
    admin --- edit
    admin --- fire

    login -. "«include»" .-> issue
    issue -. "«include»" .-> store
    list -. "«include»" .-> validate
    own -. "«include»" .-> validate
    register -. "«include»" .-> checkrole
    edit -. "«include»" .-> checkrole
    fire -. "«include»" .-> checkrole
    allsens -. "«include»" .-> checkrole
    inactive -. "«include»" .-> checkrole
    checkrole -. "«include»" .-> validate
    inactive -. "«extend»" .-> list
    fire -. "«extend»" .-> edit

    classDef emp fill:#d5f5d5,stroke:#4a8f4a,color:#000
    classDef adm fill:#fff7c2,stroke:#b59f1a,color:#000
    classDef sys fill:#e6e6e6,stroke:#777,color:#000
    class login,list,own emp
    class inactive,allsens,register,edit,fire adm
    class issue,store,validate,checkrole sys
```

legend: green = employee, yellow = admin only, grey = internal steps (not triggered by users)
