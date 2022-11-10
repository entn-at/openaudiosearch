use oas_common::types::Media;
use oas_common::{util, Record, TypedValue};
use rocket::serde::json::Json;
use rocket::{get, patch, post, put};
use rocket_okapi::openapi;
use serde_json::Value;

use crate::couch::PutResponse;
use crate::jobs::typs as job_typs;
use crate::server::auth::AdminUser;
use crate::server::error::{AppError, Result};
use crate::server::proxy;

// pub fn routes() -> Vec<Route> {
//     routes![get_media, post_media, put_media, patch_media]
// }

/// Get a media record by id.
#[openapi(tag = "Media")]
#[get("/media/<id>")]
pub async fn get_media(state: &rocket::State<crate::State>, id: String) -> Result<Record<Media>> {
    let record = state.db.get_record(&Media::guid(&id)).await?;
    Ok(Json(record))
}

/// Create a new media record
#[openapi(tag = "Media")]
#[post("/media?<transcribe>", data = "<value>")]
pub async fn post_media(
    _user: AdminUser,
    state: &rocket::State<crate::State>,
    value: Json<Media>,
    transcribe: Option<String>,
) -> Result<PutResponse> {
    let value = value.into_inner();
    let mut record = Record::from_id_and_value(util::id_from_hashed_string(&value.content_url), value);
    if let Some(_) = transcribe {
        let typ = job_typs::ASR;
        record
            .meta_mut()
            .jobs_mut()
            .settings_mut()
            .insert(typ.into(), Some(serde_json::Value::Bool(true)));
    }
    let res = state.db.put_record(record).await?;
    Ok(Json(res))
}

/// Put (update & overwrite) a media record
#[openapi(tag = "Media")]
#[put("/media/<id>", data = "<value>")]
pub async fn put_media(
    _user: AdminUser,
    state: &rocket::State<crate::State>,
    id: String,
    value: Json<Media>,
) -> Result<PutResponse> {
    let (_typ, id) = util::split_and_check_guid::<Media>(&id)?;
    let record = Record::from_id_and_value(id, value.into_inner());
    let res = state.db.put_record(record).await?;
    Ok(Json(res))
}

/// Patch (update) a media record.
#[openapi(tag = "Media")]
#[patch("/media/<id>", data = "<value>")]
pub async fn patch_media(
    _user: AdminUser,
    state: &rocket::State<crate::State>,
    id: String,
    value: Json<Value>,
) -> Result<PutResponse> {
    let db = &state.db;
    let guid = Media::guid(&id);

    let patch: json_patch::Patch = serde_json::from_value(value.into_inner())?;
    let mut existing = db.get_doc(&guid).await?.into_untyped_record()?;
    let res = existing.apply_json_patch(&patch);
    res?;
    let res = existing.into_typed_record::<Media>();
    let record = res?;
    let res = db.put_record(record).await?;
    Ok(Json(res))
}

/// Get a media record by id.
// #[openapi(tag = "Media")]
#[openapi(skip)]
#[get("/media/<id>/data")]
pub async fn get_media_data(
    headers: proxy::Headers<'_>,
    state: &rocket::State<crate::State>,
    id: String,
) -> std::result::Result<proxy::ReqwestResponse, AppError> {
    let record: Record<Media> = state.db.get_record(&Media::guid(&id)).await?;
    let url = record.value.content_url;
    let client = reqwest::Client::new();
    let mut req = client.get(url).build().unwrap();
    // eprintln!("rocket req headers {:#?}", &headers.0);
    proxy::copy_request_headers(&headers, &mut req, &proxy::HEADERS_REQUEST);
    // eprintln!("reqwest req headers {:#?}", out_req.headers());
    let res = client.execute(req).await;
    match res {
        Ok(res) => Ok(proxy::ReqwestResponse::new(res)),
        Err(err) => Err(AppError::Other(format!("{}", err))),
    }
}
