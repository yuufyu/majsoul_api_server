# mjapi

Majsoul API

## Usage
---

### Contest
 Returns json data about contests.

```
GET  /contests                          :  List of contests
GET  /contests?contest_id={contest_id}  : Contest info by contest id()
GET  /contests/:unique_id               : Contest info by unique id(CustomizedContestExtend)
GET  /contests/:unique_id/records(?next_index=[next_index])       : List of records 
```

### Record
 Return json data about game record.
```
GET  /records/{game_uuid}                : Game record
```

