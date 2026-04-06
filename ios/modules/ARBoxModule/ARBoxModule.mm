#import <React/RCTBridgeModule.h>

RCT_EXTERN_MODULE(ARBoxModule, NSObject)

RCT_EXTERN_METHOD(
  presentAR:(NSDictionary *)varietyData
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  presentStaffAR:(NSDictionary *)staffData
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  presentMarketStallAR:(NSDictionary *)stallData
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  presentBatchScanAR:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)
